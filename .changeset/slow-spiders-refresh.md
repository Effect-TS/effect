---
"effect": patch
---

Bound SQL shard-lock operations so unresponsive connections cannot leave lock
fibers running indefinitely. When shard ownership becomes uncertain, runners
immediately interrupt affected entities and stop acquiring shards until storage
recovers. After recovery, assigned shards are reacquired through the normal lock
path and start fresh entity instances, once the forced release of the previously
held locks has completed. Every failing lock operation keeps scheduling a
rebuild of the reserved connection, so a replacement connection that is also
unresponsive is rebuilt again instead of wedging the runner.
