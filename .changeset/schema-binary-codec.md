---
"effect": minor
---

Add `SchemaBinary`, a compact binary codec derived from the Schema AST.

`SchemaBinary.toCodec(schema)` compiles a wire layout from the encoded-side AST on each side, so field names never appear on the payload. `SchemaBinary.parser(schema)` reads concatenated frames from a stream, and `SchemaBinary.fieldId(n)` pins a field's wire id so it survives a rename.
