---
"effect": patch
---

Finish running layer finalizers when `ManagedRuntime.disposeEffect` is interrupted, rather than abandoning the remaining cleanup.
