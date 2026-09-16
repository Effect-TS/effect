---
"effect": patch
"@effect/openapi-generator": patch
---

Add end-to-end support for the HTTP `QUERY` method across HTTP clients, routers, HttpApi endpoints, CORS defaults, AI request metadata, and OpenAPI generation. OpenAPI 3.1 output uses `x-oai-additionalOperations`, while the OpenAPI generator accepts both that extension and the native OpenAPI 3.2 `query` field.
