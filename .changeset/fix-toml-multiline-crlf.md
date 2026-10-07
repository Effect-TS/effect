---
"effect": patch
---

Fix `Toml.parse` to trim an immediate opening CRLF in basic and literal multiline strings, matching its existing LF handling.
