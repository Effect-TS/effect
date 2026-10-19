---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` requests hanging when Node rejects the response headers. The server now sends a fallback error response, or destroys the response if that also fails.
