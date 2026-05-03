# Sample AI Conversations

These samples reflect the current backend AI behavior in `app/ai.py`, where the NVIDIA model extracts product keywords from cleaned trend text.

| # | What the User Asked / Typed | What the model responded (keywords) |
|---|---|---|
| 1 | `Oversized hoodie outfit inspo streetwear` | `["oversized hoodie", "outfit inspo", "streetwear"]` |
| 2 | `Korean oversized tshirt for men and women` | `["korean oversized tshirt", "men and women tshirt", "streetwear"]` |
| 3 | `Mini shoulder bags are trending right now` | `["mini shoulder bags", "trending"]` |
| 4 | `Canvas tote bag aesthetic design` | `["canvas tote bag", "aesthetic design"]` |
| 5 | `Drop shoulder oversized tshirt premium cotton` | `["drop shoulder", "oversized tshirt", "premium cotton"]` |
| 6 | `Trending crossbody bag lookbook 2026` | `["trending", "crossbody bag", "lookbook", "2026"]` |

## Notes

- Default model: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (override with `NVIDIA_MODEL` or `NVIDIA_KEYWORDS_MODEL`).
- API key variable: `NVIDIA_API_KEY`
- Output format expected by backend: JSON list of keywords (no markdown)
