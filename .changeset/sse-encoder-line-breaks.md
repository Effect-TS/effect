---
"effect": patch
---

Fix `Sse.encoder` dropping event data after a lone `\r`. CR and CRLF line endings in event data now start a new `data:` line, like LF.
