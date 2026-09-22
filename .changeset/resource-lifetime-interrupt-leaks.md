---
"effect": patch
---

Fix interrupt-time resource leaks:

- `Pool.get`, `Pool.use` and `RcRef.get` register cleanup before they can be interrupted.
- `RcRef` and `RcMap` finish closing expired resources even if their idle fibers are interrupted.
- `ScopedRef` closes in-flight replacements with their owner. `make`, `fromAcquire` and `set` now interrupt if the owning scope has closed.
