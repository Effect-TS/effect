---
"effect": patch
---

Add the unstable `effect/encoding/Protobuf` module. `Protobuf.toCodec` derives a Protocol Buffers binary codec from a schema whose properties are numbered with `Protobuf.field`, covering protobuf scalar types (`Protobuf.Int32`, `Protobuf.UInt64`, …), enums, maps, `oneof`s, tuples, nested collections and options, the well-known types, proto2 groups and required fields, and `Protobuf.UnknownFields` for passing unknown fields through.
