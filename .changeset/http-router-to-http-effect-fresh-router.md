---
"effect": patch
---

Build `HttpRouter.toHttpEffect` apps with a fresh router, so sub-app routes and middleware no longer register on the outer server's router when built inside `HttpRouter.serve` or `HttpRouter.toWebHandler`.

Apps that provide `HttpRouter.layer` themselves still resolve to the memoized router, which inside `serve` or `toWebHandler` is the outer server's router. Don't provide `HttpRouter.layer` to a `toHttpEffect` app.
