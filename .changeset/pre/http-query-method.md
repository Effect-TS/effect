---
"effect": patch
"@effect/openapi-generator": patch
---

Add HTTP `QUERY` support to clients, routers, HttpApi endpoints, and AI request metadata. Configure CORS support through `allowedMethods`; defaults are unchanged.

OpenAPI 3.1 output represents `QUERY` through `x-oai-additionalOperations`, which requires consumer support for that extension. The OpenAPI generator accepts the extension and the native OpenAPI 3.2 `query` field.
