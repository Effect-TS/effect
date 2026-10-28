---
"effect": minor
---

Add `Schema.isNot`, a check that rejects values matching a negated schema, and the matching `SchemaRepresentation.isNotReviver`. `SchemaRepresentation.fromJsonSchemaDocument` now imports JSON Schema `not` as this check and rejects negations that refer back to themselves without consuming a child value. JSON Schema export emits the check as `not`, or omits it as an approximation when the negated schema cannot be exported exactly. `Schema.Json` now exports as an exact `{}`.
