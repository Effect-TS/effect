---
"effect": patch
---

Fix `Config.schema` dropping every record key when the `Schema.Record` key schema decodes from a string, such as `Schema.Int`, `Schema.Number` or `Schema.NumberFromString`.
