---
"effect": patch
---

Hand cluster shards off one at a time when `Sharding` shuts down, after their entities and singletons have stopped, so live runners can take them over without waiting for the final `releaseAll`. A runner that is shutting down no longer acquires new shards, and releasing a shard no longer waits forever on an entity whose id is also active on another shard.
