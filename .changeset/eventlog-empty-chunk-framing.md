---
"effect": patch
---

Fix the public `ChunkedMessage.split` framing helper to return one empty chunk with `part: [0, 1]` for an empty `Uint8Array`, honoring its nonempty-array return contract and allowing `ChunkedMessage.join` to reconstruct the empty bytes. This does not change which encoded event-log or RPC payloads are valid.
