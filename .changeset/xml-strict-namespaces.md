---
"effect": patch
---

Add a `namespaces: "strict"` option to `Xml.decode` and `Xml.decodeString` that adds each element's `namespace` and `localName` to `StartElement` and `EndElement` events and rejects documents that are not namespace-well-formed.
