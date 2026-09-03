---
"effect": patch
---

Fix `Layer.mock` creating a `then` method that prevents mocked services from resolving through `Effect.runPromise`.
