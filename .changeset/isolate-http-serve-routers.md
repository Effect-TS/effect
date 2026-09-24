---
"effect": patch
---

`HttpRouter.serve`, `toWebHandler`, and `toHttpEffect` now each create their own router, so servers and handlers in one layer graph, or sharing a `memoMap`, no longer share routes. `toHttpEffect` also accepts a `memoMap` option.

### Breaking changes

- `HttpRouter.layer` and `HttpRouter.make` were removed. Delete the router layer and pass route layers to an entrypoint: `HttpRouter.toWebHandler(routes)` instead of `HttpRouter.toWebHandler(routes.pipe(Layer.provideMerge(HttpRouter.layer)))`.
- App layers passed to an entrypoint can no longer output `HttpRouter`; this is a type error, and a defect at build time. Generic wrappers that pass a `Layer.Layer<A, E, R>` with an unconstrained `A` must narrow the layer, since the compiler cannot rule out an `HttpRouter` output.
- Routes registered on a router provided outside `serve` are no longer served. Move the route layer into the app: `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
- A route layer used by more than one entrypoint in the same layer graph, or with a shared `memoMap`, is registered only once and returns 404 on the others. Wrap it in `Layer.fresh`, for example `const Health = Layer.fresh(HttpRouter.add("GET", "/health", HttpServerResponse.empty()))`, and provide shared resources such as database pools outside `Layer.fresh` so they are still built once.
