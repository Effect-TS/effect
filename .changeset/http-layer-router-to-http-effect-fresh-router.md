---
"@effect/platform": patch
---

Build `HttpLayerRouter.toHttpEffect` apps with a new memo map and their own router, so sub-app routes and middleware no longer register on the outer server's router when built inside `HttpLayerRouter.serve` or `HttpLayerRouter.toWebHandler`.

Layers provided inside a `toHttpEffect` app are now built for each call instead of being shared with the outer app. Services the app requires but does not provide are still taken from the surrounding context.
