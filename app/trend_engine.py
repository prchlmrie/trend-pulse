"""
trend_engine.py  —  TrendPulse

Upgrades from single-keyword trends to *named, multi-word trend phrases*.

Strategy
--------
1. Parse extracted_keywords from processed_data (already done by NVIDIA API or mock NLP).
2. Build a co-occurrence graph: two keywords that appear together in the same
   processed record are "related".
3. Cluster strongly co-occurring keywords into candidate trend phrases using a
   simple greedy union-find approach.
4. Name each cluster by joining its top-2 most-frequent keywords in title case
   (e.g. ["eco", "activewear", "recycled"] → "Eco Activewear").
5. Apply the existing MIN_TREND_FREQUENCY threshold on the cluster's *total*
   mention count so rare clusters are still filtered out.

This means your trend table will contain entries like:
  "Eco Activewear", "Biodegradable Phone Cases", "Minimalist Jewelry"
…instead of raw tokens like "eco", "phone", "jewelry".
"""

import json
from collections import Counter, defaultdict

from app.database import get_connection
from app.trend_images import image_url_for_trend_name

MIN_TREND_FREQUENCY = 2
# Two keywords must co-occur at least this many times to be clustered together
MIN_COOCCURRENCE = 2
# Maximum keywords merged into one trend name phrase
MAX_PHRASE_WORDS = 4


# ── helpers ──────────────────────────────────────────────────────────────────

def normalize_keyword(keyword: str) -> str:
    return " ".join(str(keyword).strip().lower().split())


def parse_keywords(raw_keywords) -> list[str]:
    if raw_keywords is None:
        return []
    if isinstance(raw_keywords, list):
        values = raw_keywords
    elif isinstance(raw_keywords, str):
        try:
            values = json.loads(raw_keywords)
        except json.JSONDecodeError:
            return []
    else:
        return []
    return [normalize_keyword(item) for item in values if normalize_keyword(item)]


# ── union-find for clustering ─────────────────────────────────────────────────

class UnionFind:
    def __init__(self):
        self.parent: dict[str, str] = {}

    def find(self, x: str) -> str:
        self.parent.setdefault(x, x)
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str):
        self.parent.setdefault(x, x)
        self.parent.setdefault(y, y)
        rx, ry = self.find(x), self.find(y)
        if rx != ry:
            self.parent[ry] = rx


def build_clusters(
    keyword_counts: Counter,
    cooccurrence: Counter,
    min_cooccurrence: int,
) -> dict[str, list[str]]:
    """
    Returns {root_keyword: [member_keywords]} using union-find on the
    co-occurrence graph.
    """
    uf = UnionFind()
    for (a, b), count in cooccurrence.items():
        if count >= min_cooccurrence:
            uf.union(a, b)

    clusters: dict[str, list[str]] = defaultdict(list)
    for kw in keyword_counts:
        clusters[uf.find(kw)].append(kw)

    return dict(clusters)


def name_cluster(members: list[str], keyword_counts: Counter) -> str:
    """
    Create a human-readable trend name from the cluster's top keywords.
    Picks the top-N most frequent members and joins them in title case.
    """
    sorted_members = sorted(members, key=lambda k: -keyword_counts[k])
    top = sorted_members[:MAX_PHRASE_WORDS]
    # Remove single-char tokens and stop-words that sneak through
    stop = {"and", "the", "for", "with", "in", "of", "a", "an", "to"}
    top = [w for w in top if w not in stop and len(w) > 1] or top[:1]
    return " ".join(w.title() for w in top[:2])  # two words reads best as a trend name


# ── main ──────────────────────────────────────────────────────────────────────

def build_trends(min_frequency: int = MIN_TREND_FREQUENCY):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, extracted_keywords FROM processed_data")
    rows = cursor.fetchall()

    keyword_counts: Counter = Counter()
    cooccurrence: Counter = Counter()
    keyword_to_processed: dict[str, set] = defaultdict(set)

    for processed_id, raw_kw in rows:
        keywords = parse_keywords(raw_kw)
        unique_kw = list(set(keywords))  # deduplicate within the same record

        for kw in unique_kw:
            keyword_counts[kw] += 1
            keyword_to_processed[kw].add(processed_id)

        # Build co-occurrence pairs (order-independent)
        for i in range(len(unique_kw)):
            for j in range(i + 1, len(unique_kw)):
                pair = tuple(sorted([unique_kw[i], unique_kw[j]]))
                cooccurrence[pair] += 1

    # Re-link mentions each run; upsert trends by stable display name
    cursor.execute("DELETE FROM trend_mentions")
    cursor.execute("DELETE FROM trend_metrics")

    # Cluster keywords
    clusters = build_clusters(keyword_counts, cooccurrence, MIN_COOCCURRENCE)

    trends_created = 0
    for _root, members in clusters.items():
        # Total mentions = union of all processed_ids touched by any member
        all_processed_ids: set = set()
        for kw in members:
            all_processed_ids |= keyword_to_processed[kw]

        total_mentions = sum(keyword_counts[kw] for kw in members)
        if total_mentions < min_frequency:
            continue

        trend_name = name_cluster(members, keyword_counts)
        strength = float(total_mentions)
        description = (
            f"Trend cluster: {', '.join(sorted(members)[:6])} "
            f"({int(strength)} total mentions)"
        )
        image_url = image_url_for_trend_name(trend_name)

        cursor.execute("SELECT id FROM trends WHERE name = ? LIMIT 1", (trend_name,))
        existing = cursor.fetchone()
        if existing:
            trend_id = existing[0]
            cursor.execute(
                """
                UPDATE trends
                SET strength = ?, category = ?, description = ?, image_url = ?
                WHERE id = ?
                """,
                (strength, "cluster", description, image_url, trend_id),
            )
        else:
            cursor.execute(
                """
                INSERT INTO trends (name, strength, category, description, image_url, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                """,
                (trend_name, strength, "cluster", description, image_url),
            )
            trend_id = cursor.lastrowid

        for processed_id in sorted(all_processed_ids):
            cursor.execute(
                """
                INSERT INTO trend_mentions (trend_id, processed_id, mention_count, timestamp)
                VALUES (?, ?, 1, datetime('now'))
                """,
                (trend_id, processed_id),
            )

        trends_created += 1

    cursor.execute(
        """
        DELETE FROM trends
        WHERE id NOT IN (SELECT DISTINCT trend_id FROM trend_mentions WHERE trend_id IS NOT NULL)
        """
    )

    conn.commit()
    conn.close()
    print(f"TREND ENGINE COMPLETE: {trends_created} clustered trends built (upsert by name)")