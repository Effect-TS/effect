---
"effect": patch
---

Fix `Stream.forever` and `Stream.repeat` slowing down and retaining pull layers with each repetition by using a constant-depth loop.
