---
"effect": patch
---

Fix request resolvers with synchronously completing delays, including `RequestResolver.setDelay(0)` under `TestClock`, running an empty batch and failing instead of resolving the request.
