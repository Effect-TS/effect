---
"effect": patch
---

Count buffered WebSocket text frames by their UTF-8 byte length when enforcing `highWaterMark`, rather than by UTF-16 code units. Non-ASCII text now pauses pausable connections or reports a buffer overflow at the correct byte threshold, while preserving the original frames returned by the reader.
