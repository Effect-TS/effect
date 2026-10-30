---
"@effect/platform": patch
---

Build `HttpLayerRouter.toHttpEffect` apps with a fresh router, so sub-app routes and middleware no longer register on the outer server's router when built inside `HttpLayerRouter.serve` or `HttpLayerRouter.toWebHandler`.
