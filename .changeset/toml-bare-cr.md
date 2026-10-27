---
"effect": patch
---

Fix `Toml.parse` treating everything after a bare carriage return as comment text. A carriage return not followed by a line feed now throws a `SyntaxError`; LF and CRLF line endings are still accepted.
