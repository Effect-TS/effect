---
"effect": patch
---

Fix `String.snakeToCamel` and `String.snakeToPascal` throwing on a trailing underscore or an even-length run of underscores, such as `"foo_"` or `"__"`. A trailing underscore is now dropped and an even-length run of underscores returns `""`; inputs that converted before give the same result.

`String.noCase` no longer calls a custom `transform` for input without words, such as `""` or `"---"`.
