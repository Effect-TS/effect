---
"@effect/platform-node": patch
---

Fix `NodeRedis` scope finalization hanging on pending handshakes or stalled commands and leaving connection attempts alive after shutdown. The `redis` peer dependency now requires 6.3.0 or later.
