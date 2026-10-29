---
"@effect/platform-node": patch
---

Fix `NodeRedis` scope finalization hanging on pending handshakes or stalled commands and leaving connection attempts alive after shutdown.
