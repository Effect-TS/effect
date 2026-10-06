---
"effect": patch
---

Mark `HttpMiddleware.tracer` server spans as failed for 5xx responses, including rendered errors, without changing the application exit or existing span failure causes.
