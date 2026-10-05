---
"effect": minor
---

Type `Atom.Serializable` encode/decode against `Schema.Json`, matching the JSON codec `Atom.serializable` actually uses. Previously they were typed with the schema's `Encoded` type, so for example a `Schema.BigInt` atom's `encode` claimed to return `bigint` while returning a string. Code that relied on the narrower `Encoded` type must now narrow the `Schema.Json` value itself; dehydrated values are unchanged.
