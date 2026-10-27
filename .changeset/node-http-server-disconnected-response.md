---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` holding a request and its response body in memory, or reporting a defect, when the client disconnects before the response finishes.
