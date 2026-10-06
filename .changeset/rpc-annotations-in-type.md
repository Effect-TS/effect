---
"effect": patch
---

Carry annotation keys in the `Rpc` type. `Rpc` gains a seventh type parameter that holds the identifiers of its annotation keys: `annotate` and `annotateMerge` add each key, the other transforms and `Rpc.AddError`, `Rpc.AddMiddleware` and `Rpc.Prefixed` carry it, and `Rpc.Annotations<R>` extracts it.
