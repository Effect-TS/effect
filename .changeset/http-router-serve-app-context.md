---
"effect": patch
---

Provide the app's services to the server in `HttpRouter.serve`. References set in the app, such as `HttpMiddleware.TracerDisabledWhen`, now apply to the server's tracer and logger, and `Effect.provide` inside a handler reuses layers the app already built.
