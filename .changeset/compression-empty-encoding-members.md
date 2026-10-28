---
"effect": patch
---

Fix `HttpMiddleware.compression` sending an uncompressed response when `Accept-Encoding` contains an empty list member, such as `gzip,`. Empty members are now ignored as RFC 9110 requires.
