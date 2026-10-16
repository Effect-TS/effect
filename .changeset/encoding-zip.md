---
"effect": patch
---

Add `effect/encoding/Zip` for streaming zip encoding and decoding. Encode and decode stored and deflated entries, with ZIP64 fields when needed; decoding reads entries from their local headers as the archive arrives and checks each body against its CRC-32 and sizes. Entry constructors use reproducible defaults.
