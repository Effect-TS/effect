---
"@effect/platform-bun": patch
---

Close remaining connections when `gracefulShutdownTimeout` expires in `BunHttpServer.make`, so shutdown no longer hangs on unread request bodies.
