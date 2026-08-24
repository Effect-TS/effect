---
"effect": patch
---

Add `SchemaBinary`, a compact Schema-derived codec with streaming parsing and optional fingerprints, plus RPC serialization with fingerprinted envelopes and opt-in payload fingerprints.

`SchemaBinary.encoder` is the writer that pairs with `SchemaBinary.parser`. Both accept `dictionary: true`, which shares one string table across every frame on a connection so a repeated string costs a reference after the first frame that carries it. RPC serialization turns it on for envelopes, which cuts a typical request frame roughly in half.

`SchemaAST.Declaration` gains an optional `encodingRun`, a parser factory `flip` swaps in the way it already swaps `encodingChecks`, so a declaration can behave differently when encoding.
