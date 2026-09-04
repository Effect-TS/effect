---
"effect": patch
---

Skip the stack captures when `Error.stackTraceLimit` is 0. A limit of 0 cannot carry a frame, so `Effect.fn`, `LayerMap.Service`, `LayerRef.Service`, `RpcMiddleware.Service`, `HttpApiMiddleware.Service`, `Atom.withLabel` and `addSpanStackTrace` no longer construct an `Error` at that limit, which removes a large amount of startup work on runtimes where the construction is costly.
