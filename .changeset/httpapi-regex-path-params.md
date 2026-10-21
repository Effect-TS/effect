---
"effect": patch
---

Fix `HttpApiClient` and `OpenApi.fromApi` keeping path parameter regex constraints such as `/users/:id(\d+)` in request URLs and OpenAPI paths.
