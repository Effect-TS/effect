---
"effect": patch
---

Add `effect/encoding/Zip` for streaming zip encoding and decoding. Encode and decode stored and deflated entries, with ZIP64 when needed; decoding reads entries as the archive arrives and checks each body's CRC-32 and sizes. Entry constructors use reproducible defaults.
