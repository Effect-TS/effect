---
"effect": patch
---

Bound SQL shard-lock operations so unresponsive connections cannot leave lock
fibers running indefinitely. When shard ownership becomes uncertain, runners
immediately interrupt affected entities and stop acquiring shards until storage
recovers. After recovery, assigned shards are reacquired through the normal lock
path and start fresh entity instances.
