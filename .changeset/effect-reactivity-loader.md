---
"effect": patch
---

Add experimental `effect/reactivity/Loader` caching for UI data, with optimistic mutations, infinite lists, hydration, route prefetching, and `Command.afterRefetch` to delay success until refetch completes or its budget expires.

- Pass the held route to `Router.subscription(routes, heldRoute, handler)` and mount the root with `Router.props(routes)`, or map `Router.currentRoute(routes)` for other props. A mount's root props can be an Effect that runs once before `init`. Matching initial routes emit no message; mismatches report `RouteMismatch`.
- Root subscriptions are sampled on the server. Put browser-only work in the lazy builder of `Subscription.make(name, deps, build)`.
- Declare a component's reads in its `loaders` record, as `{ load, args }` or `{ loadMany, args }` with optional `debounce` and `onChange`. The runtime keeps each result beside the Model, so read it from `h.loaded` in `view`, `$.loaded` in `update` and `loaded` in `head` and `subscriptions`, without a Model field, a message or `$.watch`.
- In `Story`, load steps take a loader's name, `given(model, loaded)` starts loaders from loaded results without an `onChange` message, and `loaded()` on a story or a `fromLog` replay is typed like `h.loaded`.

- Loader entries with `Schema.Redacted` in their args, success or error schemas stay out of server hydration data and are fetched on the client.
