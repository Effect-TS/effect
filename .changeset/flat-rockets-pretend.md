---
"effect": patch
---

Introduce FiberId.Single, make FiberId.None behave like FiberId.Runtime, relax FiberRefs to use Single instead of Runtime.

This change is a precursor to enable easier APIs to modify the Runtime when patching FiberRefs.
