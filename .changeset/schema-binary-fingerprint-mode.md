---
"effect": minor
---

Add an opt-in `SchemaBinary` fingerprint / positional wire mode.

`SchemaBinary.toCodec(schema, { fingerprint: true })` and `SchemaBinary.parser(schema, { fingerprint: true })` select a second wire mode, chosen by envelope flag bit 0. Every frame carries an 8-byte 64-bit FNV-1a hash of the compiled wire layout, and a reader whose layout hashes differently rejects the frame instead of guessing. In exchange, structs are written positionally: no field ids, a presence bitmap for optional fields, no length prefix on fixed-size leaves, and a canonical varint index in place of the union kind byte and 32-bit sentinel tag.

The hash covers wire-relevant structure only. Checks, annotations, decoded-side transformations, property declaration order, and whether a sub-schema is shared or repeated leave it unchanged; renames, added or removed fields, optionality, leaf types, tuple shape, and union membership change it.

The default mode is unchanged and remains the default. The two modes are not interchangeable: a frame written in one is rejected by a codec built for the other. On the benchmark payloads, fingerprint mode is 1% to 40% smaller raw depending on the case, with the largest wins on per-frame streams of repeated records and no win on index-signature records, where the fingerprint costs more than the field ids it removes.
