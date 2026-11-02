---
"effect": patch
---

Fix `Queue.sliding(0)` never waking waiting takers. Offers now hand the newest messages to waiting takers, and offers with no waiting taker are discarded instead of buffered.
