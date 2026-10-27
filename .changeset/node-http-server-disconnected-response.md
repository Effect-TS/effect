---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` holding a request and its response body in memory, or reporting a defect, when an HTTP/1 client disconnects before the response finishes.
