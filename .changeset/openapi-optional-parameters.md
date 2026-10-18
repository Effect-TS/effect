---
"effect": patch
---

`OpenApi.fromApi` no longer documents optional path, query, and header parameters or optional response headers as nullable. Omission is already expressed by `required: false`.
