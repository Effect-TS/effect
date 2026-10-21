---
"effect": patch
---

Fix `ManagedRuntime` requests being interrupted when they dispose the runtime before their first asynchronous step.
