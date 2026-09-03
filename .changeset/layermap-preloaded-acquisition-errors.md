---
"effect": patch
---

Preserve resource acquisition errors on `LayerMap.Service` accessors when `preload: true` is set. `get`, `contextEffect`, and `contextEffectOption` now retain the resource error type because an invalidated resource can fail when reacquired, even if preloading succeeded.

Consumers that assumed these accessors had a `never` error must handle the resource error. Runtime behavior is unchanged.
