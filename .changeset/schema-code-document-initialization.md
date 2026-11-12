---
"effect": patch
"@effect/openapi-generator": patch
"@effect/ai-openai": patch
---

Fix recursive initialization, declaration name collisions, generated types, and shared symbol identity in `SchemaRepresentation.toCodeDocument` and the OpenAPI generator.

Custom `toCode` callbacks must interpolate supplied argument strings unchanged and return supported schema/type expressions. Move unsupported code, such as functions with local declarations, into imported helpers.

The regenerated OpenAI client preserves custom HTTP client error and service types. Some nullable objects, such as `Batch.errors`, now strip undeclared fields and no longer expose index signatures; use their declared fields instead.
