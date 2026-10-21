---
"effect": patch
---

Fix `Fiber.runIn` and `Effect.forkIn` hanging when the attached fiber closes the scope itself, including parallel scopes.
