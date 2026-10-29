---
"@effect/platform-node": patch
---

Make `NodeRedis` subscriber and reserved-connection acquisition interruptible. Interrupting `Redis.subscribe` while its connection or `SUBSCRIBE` is stalled, or `Redis.reserve` while its connection is still being established, now completes promptly and closes the connection instead of holding the scope open or leaking it.
