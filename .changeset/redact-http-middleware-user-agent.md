---
"effect": patch
---

Redact `user_agent.original` in `HttpMiddleware.tracer` server spans when `user-agent` is listed in `Headers.CurrentRedactedNames`.
