---
"effect": patch
---

Flush `Channel.decodeText` and `Stream.decodeText` at the end of input, so a truncated trailing character is emitted as U+FFFD instead of dropped.
