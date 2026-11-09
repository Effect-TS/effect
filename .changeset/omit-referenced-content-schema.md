---
"effect": patch
---

Omit `contentSchema` annotations containing references in `SchemaRepresentation.fromJsonSchemaDocument` and `fromJsonSchemaMultiDocument` to avoid dangling references in generated schemas.
