---
"effect": minor
---

Add `includeAnnotationKey` to `SchemaRepresentation.fromJsonSchemaDocument` and `fromJsonSchemaMultiDocument` to preserve selected custom JSON metadata as schema annotations. Selected annotations survive normalization of retained values and can be re-exported with the exporter's matching option. Discarded annotated references no longer force resolution, while surviving annotated circular aliases are consistently rejected, including annotations introduced through `allOf`.
