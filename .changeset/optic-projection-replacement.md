---
"effect": patch
---

Restore complete replacement semantics for `Optic.pick` and `Optic.omit`: optional fields absent from the replacement are now removed from the focused projection, including when deleted through a composed `optionalKey`. Fields outside the projection are preserved.

Callers relying on the previous merge behavior should explicitly include any focused optional fields they want to retain in the replacement.
