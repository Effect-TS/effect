---
"effect": patch
---

Fix `Pool.get` and `Pool.use` hanging when called from a finalizer of the pool's own scope after its idle items were retired: they are now interrupted instead.
