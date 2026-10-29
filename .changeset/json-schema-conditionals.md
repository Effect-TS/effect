---
"effect": minor
---

Add `Schema.isConditional` and `SchemaRepresentation.isConditionalReviver`. `SchemaRepresentation.fromJsonSchemaDocument` now imports `if`/`then`/`else` as a conditional check instead of rejecting it.
