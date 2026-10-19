---
"effect": patch
---

Add `Protobuf.toCodecJson` to the unstable `effect/encoding/Protobuf` module. It derives a codec for the proto3 JSON mapping from the same layout as `Protobuf.toCodec`: lowerCamelCase field names, or custom ones set with `Protobuf.jsonName` (decoding also accepts the property key), enum names, 64-bit integers as strings, base64 bytes, RFC 3339 timestamps, durations in seconds, and the JSON forms of the wrappers and `Value`, `Struct`, and `ListValue`. Decoding accepts the alternative inputs the spec allows and ignores unknown fields unless `onExcessProperty: "error"` is set.
