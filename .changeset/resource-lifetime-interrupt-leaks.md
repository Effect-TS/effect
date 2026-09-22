---
"effect": patch
---

Fix resource leaks caused by interruption during leasing, acquisition, expiry and replacement:

- `Pool.get` / `Pool.use` and `RcRef.get` register release before interruption can strand a lease or reference count.
- `RcRef` and `RcMap` finish closing expired resources even if their idle fibers are interrupted.
- `ScopedRef` generations close with their owner, including replacements still acquiring. `ScopedRef.make`, `ScopedRef.fromAcquire` and `ScopedRef.set` now interrupt instead of returning a value if the owning scope has closed.
