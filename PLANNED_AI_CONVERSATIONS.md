# Planned AI Conversations (Future Scope)

These examples represent the planned conversational decision-assistant layer.  
The **AI Analyst** (`app/ai_analyst.py`) already answers many of these via `POST /api/ai-analyst` with live DB context; this doc still captures the fuller product vision.

| # | What the User Asked / Typed | What the assistant responded (planned / partial today) |
|---|---|---|
| 1 | The risk for `Biodegradable Phone Cases` is set to `HIGH`. Why should not I invest my full budget now? | The `HIGH` risk rating is triggered by a 60% surge in competitor entry over the last 48 hours. While demand is peaking, the `Profit Score` is dropping because major retailers launched similar low-cost alternatives. Recommendation: wait for the next `DECLINING` competitor phase to identify a premium niche entry point. |
| 2 | Generate a retail strategy for a `$5,000` budget focusing on `Eco-Friendly Activewear`. | Based on high velocity (`0.85`) and medium competition (`0.42`), I recommend an aggressive entry strategy. 1) Inventory: allocate 70% to recycled polyester leggings (higher profit score). 2) Timing: enter now while trend is `GROWING`. 3) Risk: low to medium due to strong consumer sentiment and sustainable demand growth. |
| 3 | Why is the `Cyberpunk Techwear` trend marked as `TEST` instead of `SELL`? | Although engagement is high, competition score is `0.89` (high), indicating a saturated market and tighter margins. `TEST` is recommended so you can validate your niche with a small batch before scaling to full `SELL`. |
| 4 | What is the 14-day outlook for `Smart Home Gardening Kits`? | Forecast indicates `+24%` growth in market strength over the next 14 days. Keyword clusters are shifting from `hobby` to `sustainable lifestyle`, suggesting momentum beyond a short seasonal spike. Lifecycle is around 40% of projected peak, indicating a strong 2-week entry window. |
| 5 | I am an entry-level reseller with a small budget (`$500`) and low risk tolerance. What is my best move? | Recommended product: `Minimalist Jewelry Organizers`. Why: stable `GROWING` trend with low competition (`0.15`). Action: allocate about `$350` in small units. Safety: lower unit price (`$15-$25`) helps recover capital quickly with minimal ad spend. |

## Current vs Planned

- Current: keyword extraction (NVIDIA chat API) in preprocessing; AI Analyst for natural-language Q&A (same NVIDIA stack).
- Planned: richer conversational flows, streaming, and deeper user-adaptive advisory in the UI.
