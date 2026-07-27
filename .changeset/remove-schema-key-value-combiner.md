---
"effect": patch
---

Remove the `keyValueCombiner` option from `Schema.Record` and the corresponding
`SchemaAST.KeyValueCombiner` and `SchemaAST.IndexSignature.merge` APIs.
Transformed key collisions continue to keep the last value.
