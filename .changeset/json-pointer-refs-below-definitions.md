---
"effect": patch
---

`SchemaRepresentation.fromJsonSchemaDocument` now resolves `$ref` pointers that descend below a top-level definition, such as `#/definitions/update/properties/schedule`, by translating the referenced subschema in place instead of rejecting the whole document as an unsupported reference.
