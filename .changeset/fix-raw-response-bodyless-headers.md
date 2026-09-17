---
"effect": patch
---

Preserve raw Response headers when HttpServerResponse.toWeb omits the body for HEAD or outer statuses 204, 205, and 304. Keep the outer status and status text for those bodyless statuses, otherwise preserve the native status and status text for HEAD. Append outer cookies to native Set-Cookie headers in both bodyless and ordinary raw Response conversions.
