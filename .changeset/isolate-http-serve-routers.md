---
"effect": patch
---

`HttpRouter.serve`, `toWebHandler`, and `toHttpEffect` now each create their own router, so servers and handlers in one layer graph, or sharing a `memoMap`, no longer share routes. `toHttpEffect` also accepts a `memoMap` option.

Reused `HttpRouter.add`, `addAll`, and `use` layers register on each router. A memoized wrapper around them, or a custom layer that registers routes, may build only once across entrypoints; use `Layer.fresh` on that layer if each router needs its routes.

### Breaking changes

- `HttpRouter.layer` was removed. Delete the router layer and pass route layers to an entrypoint: `HttpRouter.toWebHandler(routes)` instead of `HttpRouter.toWebHandler(routes.pipe(Layer.provideMerge(HttpRouter.layer)))`.
- An app layer may output a different `HttpRouter`, but the entrypoint serves its own router, not the one in the app output. `serve` removes `HttpRouter` from its output while retaining other app outputs.
- Routes registered on a router provided outside `serve` are no longer served. Move the route layer into the app: `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
