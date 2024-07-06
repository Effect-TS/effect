---
"effect": minor
---

Fixed the implementation of non-scoped `run*` functions across the `Channel` and `Stream`. 
This fix ensures that `Scope` is now properly excluded from the resulting effect environment. 
The affected functions include `run`, `runCollect`, `runCount`, `runDrain` and other non-scoped `run*` in both `Stream` and `Channel` modules. 
This fix brings the type declaration in line with the runtime implementation.