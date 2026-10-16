---
"effect": patch
---

Add `effect/encoding/Zip` for streaming zip encoding and decoding. Encode stored and deflated entries with data descriptors for streamed bodies and ZIP64 fields when needed; decode entries from their local headers as they arrive, with a built-in inflater and CRC-32 checks. Entry constructors use reproducible defaults.
