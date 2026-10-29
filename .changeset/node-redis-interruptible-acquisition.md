---
"@effect/platform-node": patch
---

Make `NodeRedis` subscriber and reserved-connection acquisition interruptible. Interrupting `Redis.subscribe` while its connection or `SUBSCRIBE` is stalled now completes promptly and closes the connection. Closing the layer scope while a reserved connection is still being established now closes it promptly instead of waiting for the attempt to settle or leaking it.
