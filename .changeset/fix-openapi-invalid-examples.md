---
"@effect/openapi-generator": patch
---

Drop schema examples that are incompatible with the schema's declared JSON type and emit an `invalid-schema-example-dropped` warning instead of generating TypeScript that does not typecheck.
