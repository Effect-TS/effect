---
"effect": patch
---

Add the experimental `effect/protobuf` modules. `Protobuf` declares `.proto` messages as schemas (`Message`, `field`, `Oneof`, `Enum`, `Map`, extensions, `Any`, the well-known types) and derives their binary codec with `Protobuf.toCodec`; `ProtobufJson.toCodec` derives the protobuf JSON mapping from the same schemas; `ProtobufDescriptor` and `ProtobufPlugin` hold the schemas of `descriptor.proto` and `plugin.proto`.
