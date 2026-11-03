---
"effect": patch
---

Speed up `SchemaBinary` encoding of large `Uint8Array` payloads. Payloads of 16 KiB or more are copied once into the finished frame instead of being moved again for every enclosing length prefix. The wire format is unchanged. Frames that contain such payloads are returned as their own buffer instead of a view into the shared output buffer.
