---
"effect": patch
---

Retry a failed SQL runner lock session as soon as the next shard-lock operation needs it. Previously, if a replacement lock session failed to open before any operation was waiting for it, the next operation waited out its whole deadline before the session was rebuilt, which marked lock storage unhealthy and dropped the runner's shards.
