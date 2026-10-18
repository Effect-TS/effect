---
"effect": patch
---

Make defects take precedence over typed errors in every typed recovery operator.

When a failure cause contains both a typed error and a defect, typed recovery no longer runs and the defect is no longer dropped. The failure is propagated with every typed error converted to a defect, so `Fail(e) + Die(d)` becomes `Die(e) + Die(d)`. An interruption alongside a typed error does not prevent recovery.
