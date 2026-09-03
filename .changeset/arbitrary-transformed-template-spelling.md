---
"effect": patch
---

Fix `Arbitrary.schema` to encode transformed template literal parts and validate generated and shrunk strings. Templates containing `Schema.BooleanFromBit` now generate `"0"` or `"1"` instead of invalid boolean words.
