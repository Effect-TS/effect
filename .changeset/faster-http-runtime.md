---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Improve asynchronous HTTP server throughput while preserving request cancellation, routing, middleware, tracing, and resource-lifetime behavior. Route callbacks now also receive matched path parameters, `Context.addUnsafe2` can install two trusted services without an intermediate context, `Effect.runForkWith` supports an uncurried call form, `Effect.runForkInWith` starts a fiber owned by an existing scope, and `HttpEffect.toHandledNoTracer` lets adapters skip tracing setup after determining tracing is disabled.
