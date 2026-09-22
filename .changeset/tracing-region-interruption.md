---
"effect": patch
---

Fix spans that were never ended, and services that were not restored, when a fiber was interrupted just as `Effect.withSpan`, `Effect.useSpan`, `Effect.fn`, `Effect.withParentSpan`, `Effect.provideService` or `HttpMiddleware.tracer` started. Finalizers of enclosing regions now also see the enclosing parent span again.
