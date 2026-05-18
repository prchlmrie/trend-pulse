"""
Curated HTTPS image URLs for demo trends (Unsplash CDN — hotlink-friendly).

Matched from trend *names* when the pipeline runs (`build_trends`). Not live scraping;
replace with your own CDN or marketplace image APIs in production.
"""

from __future__ import annotations

_DEFAULT = (
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8"
    "?auto=format&fit=crop&w=720&q=80"
)

_RULES: list[tuple[tuple[str, ...], str]] = [
    (
        ("hoodie", "hoody", "fleece"),
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("t-shirt", "tshirt", "oversized", " tee"),
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("tote", "canvas bag", "sling", "crossbody", "shoulder bag"),
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("clog", "crocs", "sandal"),
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("shoe", "sneaker", "school shoes", "footwear"),
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("tumbler", "water bottle", "insulated", "drinkware"),
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("sunscreen", "skincare", "serum", "beauty", "niacinamide"),
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("air fryer", "fryer", "kitchen", "appliance"),
        "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("lamp", "desk", "organizer", "study", "mesh"),
        "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("cardigan", "knit"),
        "https://images.unsplash.com/photo-1434389678759-25630d26c4c8?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("phone", "mount", "holder", "magnetic"),
        "https://images.unsplash.com/photo-1622542796254-3b069e395b76?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("fan", "portable", "neck"),
        "https://images.unsplash.com/photo-1619641801836-f3a8f7efb3f1?auto=format&fit=crop&w=720&q=80",
    ),
    (
        ("bag", "backpack"),
        "https://images.unsplash.com/photo-1548036328-c9fa89d12818?auto=format&fit=crop&w=720&q=80",
    ),
]


def image_url_for_trend_name(name: str) -> str:
    """Return a product-family stock image URL for this trend display name."""
    n = (name or "").lower()
    for keywords, url in _RULES:
        for k in keywords:
            if k in n:
                return url
    return _DEFAULT
