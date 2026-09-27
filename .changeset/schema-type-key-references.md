---
"effect": patch
---

Fix `Schema.toType` representations allocating a second, suffixed reference (such as `Value_1`) for an identified encoded schema that is also used through a key modifier such as `Schema.optionalKey` or `Schema.mutableKey`.
