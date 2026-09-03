---
"effect": patch
---

Fix `Layer.mock` creating an absent `then` method that prevents ordinary mock services from resolving through `Effect.runPromise` or `ManagedRuntime.runPromise`.

An omitted member named `then` now returns `undefined` instead of an unimplemented placeholder. If your service defines an effectful method named `then`, supply it explicitly in the mock. Explicitly supplied `then` functions and values, including `undefined`, remain unchanged.
