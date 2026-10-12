---
"effect": patch
---

Speed up `Sse.makeParser` and `Sse.decode` on long lines split across many chunks, which no longer take quadratic time.
