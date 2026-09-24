---
"effect": patch
---

`HttpRouter.serve` now uses a separate router for each server, so routes on one listener are no longer available on another listener in the same layer graph. Routes registered on an `HttpRouter.layer` provided outside `serve` are no longer served; move that route-producing layer into the app passed to `serve`. For example, replace a separately provided `RpcServer.layerProtocolHttp({ path: "/rpc" }).pipe(Layer.provide(HttpRouter.layer))` with `HttpRouter.serve(RpcLayer.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
