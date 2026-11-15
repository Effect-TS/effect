---
"effect": patch
---

Add a `namespaces: "strict"` option to `Xml.decode` and `Xml.decodeString` that reports the `namespace` and `localName` of each element and rejects documents that are not namespace-well-formed.
