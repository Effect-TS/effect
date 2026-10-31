---
"effect": patch
---

Fix `ByteSize` unit constructors throwing for decimal quantities that are a whole number of bytes, such as `megabytes(2.01)`.
