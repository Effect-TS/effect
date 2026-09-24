---
"effect": patch
---

`HttpRouter.serve` now uses a fresh router per server, so listeners no longer share routes by default. Apps that supply the same router can still share routes.

Routes registered on an `HttpRouter.layer` provided outside `serve` are no longer implicitly served and may return 404. Put the route-producing layer inside the app passed to `serve`, for example `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`, where `YourRpcHandlers` is your RPC application layer.
