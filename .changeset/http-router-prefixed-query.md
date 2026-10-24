---
"effect": patch
---

Fix `HttpRouter.prefixed` dropping the leading `/` from the local URL when only a query string follows the prefix. A handler for `/api?x=1` now sees `/?x=1` instead of `?x=1`, and a router mounted under a prefix no longer returns 404 for `/prefix?query`.
