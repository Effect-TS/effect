---
"effect": patch
---

Fix `Effect.tx` spinning instead of waiting for a transactional value to change when its body recovers from `Effect.txRetry`.
