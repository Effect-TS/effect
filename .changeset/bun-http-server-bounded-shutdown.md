---
"@effect/platform-bun": patch
---

Fix `BunHttpServer.make` shutdown hanging on unread request bodies after the graceful shutdown timeout expires.
