---
"effect": patch
---

`SchemaRepresentation.fromJsonSchemaDocument` now resolves `$ref` pointers below a top-level definition, such as `#/$defs/update/properties/schedule`, by inlining the referenced subschema instead of rejecting the document.
