---
"effect": patch
---

Prevent `Fiber.interrupt` and `Scope.close` from hanging when interrupting a forked fiber before its first scheduled execution.
