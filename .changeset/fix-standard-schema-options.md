---
"effect": patch
---

Fix hooks and parse options being ignored or reused across calls to `Schema.toStandardSchemaV1`. Both `Schema.toStandardSchemaV1` and `Schema.toStandardJSONSchemaV1` now return fresh shallow copies and compose in either order. Access statics that use `this.#field` through the original class.
