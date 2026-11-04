---
"effect": patch
---

Fix `SchemaRepresentation.fromJsonSchemaDocument` keeping `$ref`s in a `contentSchema` annotation that point to definitions the annotation does not carry, which made `openapigen` emit `"contentSchema": { "$ref": "#/$defs/Name" }`.
