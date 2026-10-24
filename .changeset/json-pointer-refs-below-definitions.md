---
"effect": patch
---

`SchemaRepresentation.fromJsonSchemaDocument` now supports `$ref` pointers below top-level definitions, including shared and recursive schemas, and rejects circular pointer aliases during import.
