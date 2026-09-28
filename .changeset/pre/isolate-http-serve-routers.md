---
"effect": patch
---

Build each `HttpRouter` entrypoint with a fresh router in a forked layer memo map. Routes on separate servers and handlers no longer leak into each other.

Breaking changes:

- Routes registered on a router provided by the app itself (for example, via `Layer.provide(HttpRouter.layer)`) are not served; the entrypoint serves its own router. For RPC, put the protocol and its handlers in the app passed to `serve`, for example `HttpRouter.serve(RpcLayer.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
- Layers first built inside an entrypoint are private to it. Providing the same stateful service to both the app and a sibling layer can build it twice depending on build order. Provide services that must be shared outside the entrypoint; services already built in the parent memo map are reused.
