---
"effect": patch
---

Fix `Schema.toStandardSchemaV1` so hooks and parse options no longer leak between callers sharing a schema. Both `Schema.toStandardSchemaV1` and `Schema.toStandardJSONSchemaV1` now return a fresh wrapper instead of mutating the input schema, while preserving schema members, class construction and statics, and composing with each other in either order.
