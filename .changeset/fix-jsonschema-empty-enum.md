---
"effect": patch
---

Fix `JsonSchema.toDocumentDraft07` to convert empty enums into valid schemas that reject every instance while preserving sibling constraints and references.
