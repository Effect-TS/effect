---
"effect": patch
---

Add `effect/encoding/Tar` for streaming tar decoding and encoding, with entry constructors that use reproducible defaults. Decode v7, USTAR, PAX and non-sparse GNU archives; encode USTAR with PAX extended headers as needed.
