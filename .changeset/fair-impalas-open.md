---
"effect": patch
---

Annotate `Config.fail` return type as `Config<never>`, so it composes with `Config.orElse` without widening the result to `Config<unknown>`
