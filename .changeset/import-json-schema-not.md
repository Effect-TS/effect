---
"effect": minor
---

Add `Schema.isNot`, a check that rejects values matching a negated schema, and the matching `SchemaRepresentation.isNotReviver`. `SchemaRepresentation.fromJsonSchemaDocument` now imports JSON Schema `not` as this check, and JSON Schema export emits it back as `not`.
