---
"effect": patch
---

Fix `SchemaRepresentation.toCodeDocument` generating code that fails to load when a schema identifier is `Schema`, `RegExp`, `Date` or `Symbol`.
