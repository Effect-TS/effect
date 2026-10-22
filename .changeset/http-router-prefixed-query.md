---
"effect": patch
---

Fix `HttpRouter.prefixed` handlers receiving `?query` without a leading `/`, so routers mounted under a prefix no longer return 404 for `/prefix?query`.
