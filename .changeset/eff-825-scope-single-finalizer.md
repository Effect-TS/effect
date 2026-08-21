---
"effect": patch
---

Store a single Scope finalizer inline instead of allocating a Map.

Most scopes only ever hold one finalizer (for example `Effect.scoped` around a
resource acquisition), so `Scope.State.Open` now keeps the first finalizer in
dedicated fields and only materializes the `finalizers` map when a second one
is added. This removes a Map allocation from every scoped acquisition and
speeds up `Pool.get` by a further ~13%.

`Scope.State.Open` changed shape: `finalizers` is now `Map | undefined`, and
the new `finalizerKey` / `finalizer` fields hold a sole registered finalizer.
