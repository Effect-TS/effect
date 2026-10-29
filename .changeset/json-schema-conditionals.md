---
"effect": minor
---

Add `Schema.isConditional` and `SchemaRepresentation.isConditionalReviver`. `SchemaRepresentation.fromJsonSchemaDocument` now imports `if`/`then`/`else` as a conditional check instead of rejecting it.

JSON Schema check compilers now receive `exact`, which says whether each dependency schema exported exactly, and `Schema.Json` now exports as an exact `{}`.
