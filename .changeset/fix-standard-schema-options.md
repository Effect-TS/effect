---
"effect": patch
---

Fix `Schema.toStandardSchemaV1` to return an isolated adapter on every call so hooks and parse options no longer leak between callers sharing a schema. Schema members, class construction and statics, and existing Standard JSON Schema metadata are preserved.
