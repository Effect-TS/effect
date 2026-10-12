---
"effect": patch
---

Bound sparse array indices in `SchemaGetter.makeTreeRecord`, used by `Schema.fromURLSearchParams` and `Schema.fromFormData`. An indexed container with more than 20 holes is now returned as an object keyed by its index strings instead of a sparse array, and appending after the maximum array index no longer throws.
