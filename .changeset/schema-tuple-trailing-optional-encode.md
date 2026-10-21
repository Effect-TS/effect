---
"effect": patch
---

Fix `Schema.Tuple` encoding leaving an empty slot when a trailing optional element such as `Schema.OptionFromOptionalKey` is omitted.
