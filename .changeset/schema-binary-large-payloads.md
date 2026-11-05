---
"effect": patch
---

Speed up `SchemaBinary` encoding of large `Uint8Array` payloads without changing the wire format.

`Uint8Array` values of 16 KiB or more are now copied when the encode call returns, after the whole batch for `encodeMany`, so they must not change during the call. If such a value's length changes, for example because its buffer is detached, the encode fails with a `SchemaError`. Frames that contain these values are returned in their own buffer instead of a view into the shared output buffer.
