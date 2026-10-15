---
"effect": patch
---

Fix `OtlpSerialization.layerJson` writing `NaN` and `Infinity` as `null`, which made OTLP collectors reject the whole export.
