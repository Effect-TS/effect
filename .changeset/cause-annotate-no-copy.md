---
"effect": patch
---

Stop copying a failure's annotations each time it is evaluated under a stack frame it already carries. `Cause.annotate` now returns the same cause, and keeps unchanged reasons, when the annotations to add are already present.
