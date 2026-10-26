---
"@effect/openapi-generator": patch
---

Add an `includeSchemas` option to `OpenApiGenerator.generate` that generates the named `components.schemas` entries, and their dependencies, even when no operation references them.
