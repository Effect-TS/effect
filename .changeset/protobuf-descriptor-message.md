---
"effect": patch
---

Add `ProtobufDescriptor` and `ProtobufMessage` to `effect/protobuf`. `ProtobufDescriptor` resolves the `FileDescriptorProto`s of `.proto` files (proto2, proto3, editions 2023 and 2024), from a `FileDescriptorSet` or as values, into descriptors of their messages, enums, extensions and services. It also exports `google/protobuf/descriptor.proto` itself, generated from protoc's descriptor of it: an interface and a `MessageDescriptor` per message, such as `FileDescriptorProto`, and its enums. `ProtobufMessage` encodes and decodes message values by their descriptors, without schemas, including unknown fields, groups, closed enums, maps, oneofs, extensions and MessageSet.
