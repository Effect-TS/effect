---
"effect": patch
---

Fix `Channel.decodeText` and `Stream.decodeText` silently dropping a truncated character at the end of the input. The remaining bytes are now decoded as a final string, U+FFFD by default or an error with `fatal: true`, so byte decoders such as `Ndjson.decode` reject truncated input instead of accepting it.
