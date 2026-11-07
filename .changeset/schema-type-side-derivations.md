---
"effect": patch
---

Fix `Schema.toEquivalence` and `Schema.toFormatter` to derive consistently from the decoded type side, including records with transformed keys.

`Schema.toFormatter`'s `onBefore` hook now receives type-side AST nodes without encoding transformations. Update hooks that depend on encoding metadata or original AST identities to use decoded AST nodes. Use `Schema.overrideToFormatter` to attach formatting to a specific schema.
