---
"effect": patch
---

Speed up `SchemaBinary` encoding of large `Uint8Array` payloads. The output buffer now grows to fit the frame instead of doubling to the next power of two, and payloads of 16 KiB or more are copied once into the finished frame instead of being moved again for every enclosing length prefix. A 256 KiB payload nested two levels deep encodes about 2x faster. The wire format is unchanged. Frames that contain such payloads are returned as their own buffer instead of a view into the shared output buffer.
