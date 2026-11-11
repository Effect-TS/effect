---
"effect": patch
"@effect/openapi-generator": patch
---

Fix recursive initialization, declaration name collisions, generated types, and shared symbol identity in `SchemaRepresentation.toCodeDocument` and the OpenAPI generator.

Custom `toCode` callbacks must interpolate supplied argument strings unchanged and return supported schema/type expressions. Move unsupported code, such as functions with local declarations, into imported helpers.
