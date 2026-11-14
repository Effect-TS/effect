---
"effect": patch
---

Add `effect/encoding/FlatBuffers` for reading and writing FlatBuffers without a schema compiler. Reads are bounds-checked and lazy, and `decode` returns a `Result`. The builder produces the same bytes as the official FlatBuffers builders.
