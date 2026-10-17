---
"effect": patch
---

Add the unstable `effect/encoding/Protobuf` module. `Protobuf.toCodec` derives a Protocol Buffers binary codec from a schema whose properties are numbered with `Protobuf.field`, with protobuf scalar types (`Protobuf.Int32`, `Protobuf.UInt64`, `Protobuf.SInt64`, …), enums, maps, `oneof`s, and the well-known types such as `Timestamp`, `Duration`, `Struct`, and the wrappers.
