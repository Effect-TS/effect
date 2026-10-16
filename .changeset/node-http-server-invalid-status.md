---
"@effect/platform-node": patch
---

`NodeHttpServer` now responds with a 500 when a handler returns a status outside 200-599. Previously a 1xx status left the client without a final response, and statuses above 599 were sent as is.
