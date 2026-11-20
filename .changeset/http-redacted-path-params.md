---
"effect": patch
---

Add `redactedParams` to `HttpRouter` routes and `params` to `HttpApi.RedactedNames`, so server spans and request logs record secret path params as `REDACTED`.
