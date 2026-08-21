---
"effect": patch
---

Add `Pool.use` for borrowing a pool item without a `Scope`.

`Pool.use(pool, f)` leases an item just for the duration of `f` and returns it
to the pool when `f` completes, fails, or is interrupted. It skips the scope
creation and finalizer bookkeeping that `Effect.scoped(Pool.get(pool))`
requires, making it the fastest way to run a single operation with a pooled
item.
