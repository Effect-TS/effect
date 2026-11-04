---
"effect": patch
"@effect/openapi-generator": patch
---

`SchemaRepresentation.fromJsonSchemaDocument` now inlines definitions referenced from a `contentSchema` annotation, so the annotation no longer points at `#/$defs/Name` entries that do not exist outside the imported document. A reference that recurses back into a definition being inlined is kept as is.

This restores self-contained `contentSchema` annotations in `openapigen` output for `#/components/schemas/Name` references. They broke in `--format httpapi` in 4.0.6 and never worked in `--format httpclient`.
