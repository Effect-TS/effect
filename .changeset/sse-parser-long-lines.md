---
"effect": patch
---

Fix quadratic parsing time in `Sse.makeParser` and `Sse.decode` for long lines split across many chunks.
