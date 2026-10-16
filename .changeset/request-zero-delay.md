---
"effect": patch
---

Fix `Effect.request` failing when a resolver's batch delay completes synchronously, such as `RequestResolver.setDelay(0)` under `TestClock`, by registering the request before the delay starts.
