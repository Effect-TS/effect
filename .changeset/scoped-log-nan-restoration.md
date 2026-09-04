---
"effect": patch
---

Fix `Effect.annotateLogsScoped` to restore the previous annotation, or remove a newly introduced key, when an unchanged scoped value is `NaN`. This also applies when explicitly closing a caller-managed scope. Genuinely replaced values remain untouched, and the existing equivalence of positive and negative zero is preserved.
