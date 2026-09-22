---
"effect": patch
---

Fix four interrupt-time resource leaks in `Pool`, `RcRef`, `RcMap` and `ScopedRef`.

- `Pool.use` counted a lease one step before it installed the release. A fiber interrupted in between kept the lease forever, so a pool of size 1 made every later `use` wait forever. `use` and `get` now lease and install the release in one uninterruptible step.
- `RcRef.get` raised the reference count two steps before it registered the finalizer that lowers it. A fiber interrupted in between pinned the resource for the lifetime of the `RcRef`; `Stream.share` reaches this through its `RcRef`.
- `RcRef` and `RcMap` closed an idle resource interruptibly after taking it out of the ref or map, so closing the owning scope during that close skipped the remaining finalizers. The idle fiber now closes uninterruptibly, and only its sleep can be interrupted.
- A `ScopedRef.set` in flight while the owning scope closed installed a value that was never released. Each generation's scope is now forked from the ref's own scope, which the owner closes.
