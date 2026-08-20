---
"effect": minor
---

Add `SchemaBinary`, a compact binary codec derived from the Schema AST.

`SchemaBinary.toCodec(schema)` compiles a wire layout from the encoded-side AST on each side, so field names never appear on the payload. `SchemaBinary.parser(schema)` reads concatenated frames from a stream, and `SchemaBinary.fieldId(n)` pins a field's wire id so it survives a rename.

Encoded results are stable views into a shared bump-allocated arena. Their byte range is exact, but their backing buffer may be larger, have a non-zero offset, and contain other encoded results. Copy a result before transferring its buffer when independent ownership is required.
