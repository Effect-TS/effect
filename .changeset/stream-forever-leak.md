---
"effect": patch
---

Fix `Stream.forever` and `Stream.repeat` accumulating pull layers and retaining resources across repetitions. Repetitions now use a constant-depth loop and close each run's scope before the next one.
