---
"effect": patch
---

Preserve raw Response headers, status, and status text when HttpServerResponse.toWeb omits the body for HEAD or outer statuses 204, 205, and 304.
