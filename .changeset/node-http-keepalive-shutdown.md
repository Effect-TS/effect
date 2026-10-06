---
"@effect/platform-node": patch
---

Keep-alive requests during Node HTTP server shutdown are answered or the connection is closed, and disposing the server completes when the graceful shutdown timeout elapses.
