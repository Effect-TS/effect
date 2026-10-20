---
"effect": patch
---

Make `Stream.zip`, `zipWith`, `zipLeft`, `zipRight` and `zipFlatten` run in linear time when one side emits large chunks and the other emits small ones.
