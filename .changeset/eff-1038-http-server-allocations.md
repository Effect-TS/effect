---
"effect": patch
"@effect/platform-node": patch
---

Reduce HTTP server allocations per request.

When no tracing backend is installed (the `Tracer.Tracer` reference still holds
the new `Tracer.nativeTracer` default), the HTTP tracer middleware no longer
records request and response span attributes, and `HttpRouter` skips the
`http.route` attribute. Spans are still created, so `Effect.currentSpan` and
trace context propagation behave as before.

`Tracer.NativeSpan` now generates its trace and span identifiers and creates
its attribute map and event list lazily on first access.

The web handler and Node HTTP server no longer register abort/close listeners
for request fibers that already completed synchronously.
