---
"@effect/platform-node": patch
---

Fix `NodeRedis` scope finalization hanging on pending handshakes or stalled commands. The shared client is now destroyed immediately when its scope closes, failing in-flight commands and aborting pending connection attempts.
