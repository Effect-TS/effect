---
"effect": patch
---

Fix `JsonSchema.toDocumentDraft07` emitting `enum: []`, which the Draft-07 metaschema rejects. An empty enum now becomes an `allOf` entry that rejects every value.
