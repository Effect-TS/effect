---
"@effect/platform-node": patch
---

Abort the connection when a streamed response body fails after the response has started, instead of ending it normally so the client reads a truncated body as complete.
