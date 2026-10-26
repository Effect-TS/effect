---
"@effect/protobuf-generator": patch
---

Add `@effect/protobuf-generator`, with `protoc-gen-effect`, a buf and protoc plugin that generates Effect Schema modules from `.proto` files.

Each module exports schemas for the file's messages and enums, its extensions, and a `registry`, ready for `Protobuf.toCodec`. proto2, proto3, and editions 2023 and 2024 are supported. Use `proto_map` to import files that are generated elsewhere, such as by a library, instead of generating them again.
