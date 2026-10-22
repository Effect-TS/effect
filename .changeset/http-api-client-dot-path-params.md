---
"effect": patch
---

Reject `.` and `..` path parameters in `HttpApiClient` so they cannot change the request path through URL normalization.
