---
"effect": patch
---

Fix `SchemaRepresentation.fromJsonSchemaDocument` rejecting objects whose `anyOf` / `oneOf` branches are combined with sibling properties that contain an `enum`, such as branches redeclaring an enum property already declared by the object.
