---
"effect": patch
---

HttpApiBuilder: distribute handler `Requires` markers per service.

`HandlerRequirements` emitted a single combined `HttpRouter.Request<"Requires", A | B>`
marker when a handler needed multiple services. `HttpRouter` middleware layers provide
distributed per-service markers (`Request.From<"Requires", Provides>`), so the combined
marker could never be eliminated by `Layer.provide` and leaked into the route layer's
requirements. Emitting `Request.From<"Requires", R>` restores the distributed shape.
