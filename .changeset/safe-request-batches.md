---
"effect": patch
---

Fix synchronous RequestResolver delays executing empty batches and leaking requests into another resolver's batch.
