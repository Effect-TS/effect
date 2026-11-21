---
"effect": patch
---

Fix a forked fiber that was interrupted before it started sometimes running its effect anyway, which could leave `Fiber.interrupt` or `Scope.close` waiting forever.
