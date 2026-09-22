---
"effect": patch
---

Rename range checks so their subject comes last: `Schema.isBetweenLength`, `Schema.isBetweenCodePoints`, `Schema.isBetweenSize`, and `Schema.isBetweenProperties`. Also rename the string checks to the grammatical `Schema.isStartingWith`, `Schema.isEndingWith`, and `Schema.isIncluding`. Update the corresponding `SchemaRepresentation.*Reviver` exports and persisted `effect/schema/...` check IDs to use the new names.
