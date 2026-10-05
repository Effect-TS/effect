---
"effect": patch
---

Fix `AtomRuntime.subscriptionRef` to include the runtime's layer error in the resulting `AsyncResult` error type, matching the failure it can already produce at runtime.
