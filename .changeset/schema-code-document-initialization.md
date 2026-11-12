---
"effect": patch
"@effect/openapi-generator": patch
"@effect/ai-openai": patch
"@effect/ai-anthropic": patch
---

Add the experimental `Codegen.Module` builder and fix recursive initialization, name collisions, generated types, and symbol identity in schema and OpenAPI generation.

Custom `toCode` callbacks must interpolate supplied argument strings unchanged and return supported schema/type expressions. Move unsupported code, such as functions with local declarations, into imported helpers.

Some nullable OpenAI objects, such as `Batch.errors`, now strip undeclared fields and no longer expose index signatures; use their declared fields instead.
