---
"effect": patch
---

End tracing spans and restore fiber context when interruption occurs as a traced region starts. Ensure `HttpMiddleware.tracer` ends its span on interruption.
