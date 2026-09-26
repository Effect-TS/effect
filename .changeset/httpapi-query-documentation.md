---
"effect": patch
---

Render and execute HTTP `QUERY` operations in API documentation. Update the embedded Swagger UI to 5.32.15 and Scalar API Reference to 1.69.0.

`OpenApi.fromApi` now emits OpenAPI 3.2.0 with native `query` path operations when an included endpoint uses `QUERY`. APIs without included `QUERY` endpoints continue to emit OpenAPI 3.1.0.

### Breaking changes

Consumers reading generated `QUERY` operations must use `paths[path].query` instead of `paths[path]["x-oai-additionalOperations"].QUERY` and support OpenAPI 3.2.0. The `OpenAPISpec.openapi` type widens to `"3.1.0" | "3.2.0"`, and `OpenAPISpecMethodName` includes `"query"`; update version assumptions and exhaustive method matches accordingly.
