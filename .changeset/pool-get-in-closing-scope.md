---
"effect": patch
---

Fix `Pool.get` and `Pool.use` hanging in finalizers registered after the pool once its idle items expire. The pool now runs in a child scope that stays open until the pool shuts down.
