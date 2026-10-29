---
"effect": minor
---

Add `Schema.isConditional` and `SchemaRepresentation.isConditionalReviver`. `SchemaRepresentation.fromJsonSchemaDocument` now imports `if`/`then`/`else` as a conditional check instead of rejecting it.

JSON Schema check compilers can now read an optional `exact` input, which says whether each dependency schema matches its predicate on the JSON instance exactly. `Schema.Json` now exports as an exact `{}`, while opaque declarations and checked `Unknown` or `ObjectKeyword` schemas, whose JSON encoding drops their checks, stay approximate.
