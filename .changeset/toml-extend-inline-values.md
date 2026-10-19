---
"effect": minor
---

`Toml.parse` now returns a `Result` instead of throwing, failing with an `EncodingError` on invalid input. It also rejects documents that extend an inline table or a statically defined array, which TOML 1.0 forbids.
