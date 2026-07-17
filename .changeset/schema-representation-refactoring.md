---
"effect": patch
---

Rename `SchemaRepresentation.Artifact.generation` to `code` and the representation conversion APIs to `toRepresentation`, `toRepresentations`, `fromRepresentation`, and `fromRepresentations`.

Use the standard `Schema.Struct` decoding behavior for persisted representations, including ignoring excess properties.

Encode numbers, bigints, and symbols in persisted representations using their canonical JSON codecs.

Remove the public `DocumentFromJson` and `MultiDocumentFromJson` codecs in favor of `toJson`, `fromJson`, `toJsonMultiDocument`, and `fromJsonMultiDocument`.
