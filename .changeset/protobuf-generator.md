---
"@effect/protobuf-generator": patch
"effect": patch
---

Add `@effect/protobuf-generator`, with `protoc-gen-effect`: a protoc and buf plugin that generates, per `.proto` file, its descriptor, an interface and a `MessageDescriptor` per message, and the descriptors of enums, extensions and services for `effect/protobuf`.

Add `ProtobufPluginProto`, the types and descriptors of `google/protobuf/compiler/plugin.proto`, for writing protoc plugins. It and `ProtobufDescriptorProto` re-export the plain output of `protoc-gen-effect`, which reads its requests with them.

`ProtobufDescriptor` no longer re-exports `descriptor.proto`: use `ProtobufDescriptorProto`. `fromFileDescriptorSet` moved to `ProtobufDescriptorProto.fromFileDescriptorSet`.

`ProtobufDescriptor.make` takes a `dependencies` option: files resolved before, which the new files link to instead of resolving them again.

Add `Codegen.Module#isReserved`.
