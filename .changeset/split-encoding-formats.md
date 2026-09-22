---
"effect": patch
---

Split the encoding API into `effect/encoding/Base64`, `effect/encoding/Base64Url`, `effect/encoding/Hex`, and `effect/encoding/EncodingError`. The former `effect/Encoding` module has been removed; migrate each helper to its format module and use the shared error entrypoint to name or narrow encoding failures.
