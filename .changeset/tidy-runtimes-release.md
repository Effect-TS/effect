---
"effect": patch
---

Fix `ManagedRuntime` disposal deadlocking when called from one of its own fibers, including their child fibers.
