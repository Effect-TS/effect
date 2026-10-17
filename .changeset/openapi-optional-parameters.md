---
"effect": patch
---

Fix `OpenApi.fromApi` documenting `Schema.optional` path, query, and header parameters and response headers as nullable. They are now documented by their encoded value schema with `required: false`.
