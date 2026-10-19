---
"effect": patch
---

`Toml.parse` now returns a `Result` with an `EncodingError` instead of throwing, and rejects documents that extend an inline table or a statically defined array, as TOML 1.0 requires.
