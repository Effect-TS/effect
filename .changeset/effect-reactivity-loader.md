---
"effect": patch
---

Add experimental `effect/reactivity/Loader` caching for UI data, with optimistic mutations, infinite lists, hydration, route prefetching, and `Command.afterRefetch` to delay success until refetch completes or its budget expires.

- Pass the held route to `Router.subscription(routes, heldRoute, handler)` and initialize root props with `Router.currentRoute(routes)`. Matching initial routes emit no message; mismatches report `RouteMismatch`.
- Root subscriptions are sampled on the server. Put browser-only work in the lazy builder of `Subscription.make(name, deps, build)`.
