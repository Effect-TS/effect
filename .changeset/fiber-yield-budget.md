---
"effect": patch
---

Fix fibers that never finish, and `Effect.runSync` hanging, when `Scheduler.MaxOpsBeforeYield` is 1 or 2.
