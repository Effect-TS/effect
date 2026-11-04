---
"effect": patch
---

Inline referenced definitions into `contentSchema` annotations imported by `SchemaRepresentation.fromJsonSchemaDocument`, so the annotation no longer carries `$ref`s to definitions it does not include. This fixes `openapigen` emitting `"contentSchema": { "$ref": "#/$defs/Name" }` without the `Name` component.
