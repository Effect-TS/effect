---
"effect": patch
---

Add `effect/protobuf` with `ProtobufReader` and `ProtobufWriter`, a Schema-independent reader and writer of the protobuf wire format, and speed up OTLP protobuf serialization, which now writes log record trace and span ids given as a `Uint8Array` as those bytes instead of corrupting them.
