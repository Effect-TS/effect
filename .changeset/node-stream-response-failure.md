---
"@effect/platform-node": patch
---

Abort the connection when a streamed response body fails after headers are sent. Previously the response ended normally, so clients treated the truncated body as complete.
