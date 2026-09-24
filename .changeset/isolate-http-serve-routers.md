---
"effect": patch
---

`HttpRouter.serve` now provides a fresh router for each server, preventing routes from leaking between listeners in the same layer graph when the apps do not supply their own router. If an app supplies a shared `HttpRouter` itself, `serve` uses that router and the listeners can still share routes. Routes registered on an `HttpRouter.layer` provided outside `serve` are no longer implicitly served; move the route-producing layer into the app passed to `serve`. For example, instead of providing `HttpRouter.layer` to `RpcServer.layerProtocolHttp({ path: "/rpc" })` separately, use `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`, where `YourRpcHandlers` is your application layer containing the RPC handlers.
