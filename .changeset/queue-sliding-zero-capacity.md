---
"effect": patch
---

Fix zero-capacity sliding queues so offers hand the newest messages to waiting takers. Offers with no waiting taker are now discarded instead of buffered.
