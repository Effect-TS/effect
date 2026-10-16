---
"effect": patch
---

Compile the synchronous Schema JIT and AOT decoders for values whose encodings use the library's own conversions of primitive values, such as the `Number`, `Boolean`, literal and numeric enum links of `Schema.toCodecStringTree`. Encodings with user transformations, user checks on the encoded side, or non-primitive sources keep the previous parser.
