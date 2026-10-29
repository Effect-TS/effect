---
"effect": patch
---

`OpenApi.fromApi` now throws when equivalent path templates use different parameter names across HTTP methods (e.g. `GET /users/{id}` and `DELETE /users/{userId}`), instead of silently producing an invalid OpenAPI document.
