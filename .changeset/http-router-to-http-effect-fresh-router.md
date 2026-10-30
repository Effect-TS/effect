---
"effect": patch
---

Build `HttpRouter.toHttpEffect` apps with a fresh router, so sub-app routes and middleware no longer register on the outer server's router when built inside `HttpRouter.serve` or `HttpRouter.toWebHandler`.
