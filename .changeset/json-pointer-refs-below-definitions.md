---
"effect": patch
---

`SchemaRepresentation.fromJsonSchemaDocument` now resolves `$ref` pointers below a top-level definition, such as `#/$defs/update/properties/schedule`, as shared, possibly recursive, definitions instead of rejecting the document.
