---
"effect": patch
---

Fix `Channel.decodeText` and `Stream.decodeText` dropping truncated characters by flushing the decoder when input completes.
