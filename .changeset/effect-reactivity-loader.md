---
"effect": patch
---

Add `effect/reactivity/Loader`, an experimental keyed data cache whose reads are `Loader.Service` classes, with optimistic patches, writes, snapshots (one entry with `Loader.Snapshot`, one per args with `Loader.SnapshotMap`, or a paged list with `Loader.SnapshotList`), infinite lists with `Loader.ListService` and `$.loadMore`/`$.reset`, hydration, and route prefetching with `Router.prefetch` and `Router.page` on link intent and navigation, and `effect/testing/TestLoader` to test code that uses it.

Pass the Model's held route as the second argument to `Router.subscription(routes, heldRoute, handler)`, and initialize root props with `Router.currentRoute(routes)`. Matching initial routes no longer dispatch a message; mismatches report `RouteMismatch`. Root subscriptions are sampled on the server, so keep browser-only work inside the lazy builder of `Subscription.make(name, deps, build)`.
