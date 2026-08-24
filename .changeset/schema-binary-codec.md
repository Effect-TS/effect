---
"effect": patch
---

Add `SchemaBinary`, a compact Schema-derived codec with streaming parsing and optional fingerprints, plus RPC serialization with fingerprinted envelopes and opt-in payload fingerprints.

Channel helpers are deferred. They can be built from `SchemaBinary.parser` and `SchemaBinary.encodeUnknownSync` when needed.

`SchemaAST.Declaration` gains an optional `encodingRun`, a parser factory `flip` swaps in the way it already swaps `encodingChecks`, so a declaration can behave differently when encoding.
