---
"effect": patch
---

Speed up `SchemaBinary` encoding of large `Uint8Array` payloads. Payloads of 16 KiB or more are copied once into the finished frame instead of being moved again for every enclosing length prefix. The wire format is unchanged. Frames that contain such payloads are returned as their own buffer instead of a view into the shared output buffer.

Such payloads are now read just before the encode call returns, including through `toCodec` and `encoder`. For `encodeMany`, that is after the whole batch is written. Changing a payload during the call changes the output, and resizing or detaching its buffer fails the encode with a `SchemaError`.
