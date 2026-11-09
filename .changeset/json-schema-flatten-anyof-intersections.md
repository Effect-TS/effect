---
"effect": patch
---

Flatten nested `anyOf` alternatives and drop duplicate `null` alternatives before intersecting unions in `SchemaRepresentation.fromJsonSchemaDocument`, so a nullable reference to a definition that already admits `null` can be intersected.
