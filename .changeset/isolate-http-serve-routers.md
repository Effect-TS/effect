---
"effect": patch
---

`HttpRouter.serve`, `toWebHandler`, and `toHttpEffect` now each create their own router, so servers and handlers in one layer graph, or sharing a `memoMap`, no longer share routes. `toHttpEffect` also accepts a `memoMap` option.

### Breaking changes

- `HttpRouter.layer` and `HttpRouter.make` were removed. Delete the router layer and pass route layers to an entrypoint: `HttpRouter.toWebHandler(routes)` instead of `HttpRouter.toWebHandler(routes.pipe(Layer.provideMerge(HttpRouter.layer)))`.
- App layers passed to an entrypoint can no longer output `HttpRouter`; this is a type error, and a defect at build time.
- Routes registered on a router provided outside `serve` are no longer served. Move the route layer into the app: `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
