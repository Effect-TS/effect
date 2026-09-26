---
"effect": patch
---

Emit the encoded schema of `HttpApiSchema.asText()` bodies in OpenAPI documents instead of a plain string. Text literals now appear as `enum` values, and exportable string checks such as `pattern` are kept.
