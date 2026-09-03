---
"effect": patch
---

Fix `Effectable.Class` instances not executing their `override` effect when run directly or yielded in `Effect.gen`. The override is read lazily on each execution, preserving instance state and provided services.
