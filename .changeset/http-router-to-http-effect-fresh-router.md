---
"effect": minor
---

Build `HttpRouter.toHttpEffect` apps with their own router, so sub-app routes and middleware no longer register on the outer server's router when built inside `HttpRouter.serve` or `HttpRouter.toWebHandler`. The sub-app's router also stands in for `HttpRouter.layer` within the app, so apps that provide it themselves are isolated too.

`Layer.forkMemoMap`, `Layer.forkMemoMapUnsafe` and `Layer.CurrentMemoMap.forkOrCreate` accept a `fresh` option listing layers that the child memo map builds again instead of reusing from its parent.
