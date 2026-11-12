---
"effect": patch
---

Fix `Xml.decode` to fail with a `Syntax` error instead of `Unsupported` when an encoding declaration contradicts the bytes, and to reject a US-ASCII declaration after a UTF-8 byte order mark instead of accepting it.
