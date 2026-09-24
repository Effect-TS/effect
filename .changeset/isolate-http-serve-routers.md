---
"effect": patch
---

`HttpRouter.serve`, `toWebHandler`, and `toHttpEffect` now each create their own router, so servers and handlers in one layer graph, or sharing a `memoMap`, no longer share routes. `toHttpEffect` also accepts a `memoMap` option.

Each entrypoint builds its app layers privately, so even reused or custom route layers register on each router. Dependencies built inside an app are also private to that entrypoint. Provide services outside the app to share them; a supplied `memoMap` still reuses dependencies already built in it.

### Breaking changes

- `HttpRouter.layer` was removed. Delete the router layer and pass route layers to an entrypoint: `HttpRouter.toWebHandler(routes)` instead of `HttpRouter.toWebHandler(routes.pipe(Layer.provideMerge(HttpRouter.layer)))`.
- An app layer may output a different `HttpRouter`, but the entrypoint serves its own router, not the one in the app output. `serve` removes `HttpRouter` from its output while retaining other app outputs.
- Routes registered on a router provided outside `serve` are no longer served. Move the route layer into the app: `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
