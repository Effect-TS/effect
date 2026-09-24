---
"effect": patch
---

`HttpRouter.serve`, `toWebHandler`, and `toHttpEffect` now each create their own router, so servers and handlers in one layer graph, or sharing a `memoMap`, no longer share routes. `toHttpEffect` also accepts a `memoMap` option.

Each entrypoint builds its app layers privately, so even reused or custom route layers register on each router.

### Breaking changes

- Layers first built inside an entrypoint app are private to it; layers already built in the parent memo map are reused. A service provided both inside the app and to a sibling may therefore be built twice, depending on build order. Provide services that must be shared outside the entrypoint.
- An app layer may output a different `HttpRouter`, but the entrypoint serves its own router, not the one in the app output. `serve` removes `HttpRouter` from its output while retaining other app outputs.
- Routes registered on a router provided outside `serve` are no longer served. Move the route layer into the app: `HttpRouter.serve(YourRpcHandlers.pipe(Layer.provideMerge(RpcServer.layerProtocolHttp({ path: "/rpc" }))))`.
