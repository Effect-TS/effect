---
"effect": patch
---

Fix `Fiber.runIn` and `Effect.forkIn` hanging when the attached fiber closes its own scope.
