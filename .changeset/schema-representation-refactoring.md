---
"effect": patch
---

Rename `SchemaRepresentation.Artifact.generation` to `code` and the representation conversion APIs to `toRepresentation`, `toRepresentations`, `fromRepresentation`, and `fromRepresentations`.

Use the standard `Schema.Struct` decoding behavior for persisted representations, including ignoring excess properties.
