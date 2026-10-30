---
"effect": patch
---

`Sse.encoder` now removes CR and LF from event `id` and `event` values, and NUL from `id` values, so they cannot add fields or events to the encoded stream.
