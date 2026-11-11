---
"effect": patch
---

Speed up OTLP protobuf serialization by writing each message into one growing buffer instead of allocating and concatenating a byte array per field. The encoded bytes are unchanged.
