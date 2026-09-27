---
"effect": patch
---

Preserve encoded string literals and exportable checks such as `pattern` in OpenAPI schemas for `HttpApiSchema.asText()` bodies. Text bodies keep their string type even when their schemas are opaque or referenced components.
