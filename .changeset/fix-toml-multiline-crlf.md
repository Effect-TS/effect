---
"effect": patch
---

Fix `Toml.parse` keeping a leading `\r\n` in multiline strings from CRLF documents. The line break right after an opening `"""` or `'''` delimiter is now trimmed for both LF and CRLF line endings.
