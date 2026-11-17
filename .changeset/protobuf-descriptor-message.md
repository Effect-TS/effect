---
"effect": patch
---

Add `ProtobufDescriptor`, `ProtobufDescriptorProto`, and `ProtobufMessage` for codecs preserving names and unknown fields across proto2, proto3, and editions 2023, 2024 and 2026.

Replace `reader.enter(); read(reader); reader.leave()` with `read(reader.delimited())`. The child reader is bounded to the payload, and the parent advances past it immediately.

`ProtobufWriter.tag` now throws `RangeError` for invalid tags; supply an integer field number from 1 through 536870911 and a wire type from 0 through 5.
