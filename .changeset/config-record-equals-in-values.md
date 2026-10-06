---
"effect": patch
---

Keep `=` inside values when decoding key-value strings, so `Config.Record` and the OTLP header and resource attribute variables no longer truncate values such as base64 credentials.
