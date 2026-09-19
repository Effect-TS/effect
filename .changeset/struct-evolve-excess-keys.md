---
"effect": patch
---

Reject unknown keys in `Struct.evolve` at the type level. Previously a transform for a key that does not exist on the struct was silently accepted and ignored; it is now a compile-time error.
