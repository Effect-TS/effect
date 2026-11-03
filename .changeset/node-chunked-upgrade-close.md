---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` shutdown hanging on Node 25 and older after refusing a chunked non-WebSocket upgrade request with `411 Length Required`.
