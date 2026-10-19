---
"effect": patch
---

Fail `Xml.decode` on UTF-16 input with an `Unsupported` `XmlError` instead of a `Syntax` error for invalid UTF-8.
