---
"effect": patch
---

`Scope.close` now requires a `Scope.Closeable`. Use a scope created by `Scope.make` or `Scope.fork`; a plain `Scope.Scope` cannot be closed directly.
