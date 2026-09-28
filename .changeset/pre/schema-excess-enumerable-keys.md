---
"effect": patch
---

Ignore non-enumerable own properties when checking schema excess properties, allowing `Schema.TaggedError` responses to encode under strict `HttpApi.ParseOptions`. Symbol index signatures now skip non-enumerable entries during decoding and encoding, matching string index signatures; make those properties enumerable or declare them explicitly in a `Struct` to retain them.
