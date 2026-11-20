---
"@effect/platform-node": patch
---

Prevent `NodeHttpServer` from crashing on unhandled request `error` events emitted after a streamed request is aborted.
