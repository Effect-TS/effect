---
"effect": patch
---

Fix OTLP attributes with integers outside the signed 64-bit range, which made OTLP collectors reject the whole export. Such numbers are now sent as `doubleValue`, and such bigints as `stringValue`.
