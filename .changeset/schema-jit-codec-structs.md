---
"effect": patch
---

Compile the synchronous Schema JIT decoder for values whose encodings are built from replay-safe library codecs, such as the `Number`, `Boolean`, literal and numeric enum links of `Schema.toCodecStringTree`. A codec Struct now decodes valid input in one generated function instead of falling back to the interpreter. Encodings with user transformations or user checks on their encoded side keep the previous parser.
