---
"effect": patch
---

`Scope.closeUnsafe` now requires a `Scope.Closeable`, matching `Scope.close`. Use a scope created by `Scope.make` or `Scope.fork`; a plain `Scope.Scope` cannot be closed directly.
