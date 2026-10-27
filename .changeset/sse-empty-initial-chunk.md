---
"effect": patch
---

Fix `Sse.makeParser` dropping the first event of a stream that starts with a UTF-8 BOM when an empty chunk is fed first.
