---
"effect": minor
---

Ensure `Scope` is excluded from `R` in the `Channel` / `Stream` `run*` functions.

This fix ensures that `Scope` is now properly excluded from the resulting effect environment. 
The affected functions include `run`, `runCollect`, `runCount`, `runDrain` and other non-scoped `run*` in both `Stream` and `Channel` modules. 
This fix brings the type declaration in line with the runtime implementation.
