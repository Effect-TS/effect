---
"effect": patch
---

Skip optional stack capture when `Error.stackTraceLimit` is zero in `Effect.fn`, spans, layer and middleware service definitions, and atom labels. Preserve named spans and enabled stack locations, and leave a zero limit unchanged when formatting causes.

Explicit span options remain supported at a zero global limit: `captureStackTrace: true` opts into capture, and a supplied stack callback is preserved. The `stack` property on `LayerMap.Service`, `LayerRef.Service`, `HttpApiMiddleware.Service`, and `RpcMiddleware.Service` definitions is `undefined` when defined at limit zero; positive limits retain the definition location.
