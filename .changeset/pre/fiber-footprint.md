---
"effect": patch
---

Reduce the memory each fiber retains: the type brand now lives on the prototype, `Effect.callback` no longer binds its registration, and `Fiber.joinAll` no longer keeps a cancel closure per joined fiber.
