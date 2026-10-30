---
"effect": patch
---

Fix `OtlpSerialization.layerJson` writing `bytesValue` data as plain objects instead of base64 strings. `Uint8Array` views and Node `Buffer`s are now encoded as OTLP/JSON expects.
