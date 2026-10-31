---
"effect": patch
---

Add `Json5.parse` and `Jsonc.parse` to `effect/encoding`, returning a `Result` that fails with an `EncodingError` on invalid input.
