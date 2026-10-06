---
"effect": patch
---

Add opt-in `allowSessionTermination` to `McpServer.layerHttp`. DELETE ends the session and interrupts its active requests; later requests with that session id return `404`.

Fix an RPC cancellation race by registering request fibers before their handlers run.
