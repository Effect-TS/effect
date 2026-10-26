---
"@effect/protobuf-generator": patch
---

Add `@effect/protobuf-generator`, whose `protoc-gen-effect` plugin for buf and protoc generates Effect Schema modules from `.proto` files: messages, enums, oneofs, maps, groups, extensions, recursive messages, defaults, well-known types, and a registry per file, for proto2, proto3, and editions 2023 and 2024. `proto_map` imports the files that are generated elsewhere, such as by a library.
