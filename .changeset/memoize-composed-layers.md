---
"effect": patch
---

Memoize composed layers by identity, as in v3. `Layer.provide`, `Layer.provideMerge` and `Layer.mergeAll` (and the operators built on them) now check the `MemoMap`, so a composed layer referenced from several parents is built once per memo map instead of once per path. Deeply shared `.Default`-style layers no longer rebuild their whole chain on every path, which could leave millions of scopes open at startup.

A composed layer that is shared now shares everything inside it, including dependencies wrapped in `Layer.fresh`. Wrap the composed layer itself in `Layer.fresh` to get a separate copy. As with leaf layers, a shared build runs on the first requester's fiber, so if that fiber is interrupted, every requester waiting on the shared build sees the interruption.
