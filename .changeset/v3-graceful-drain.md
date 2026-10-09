---
"@effect/cluster": patch
---

Hand cluster shards off one at a time when `Sharding` shuts down, after their entities and singletons have stopped, so live runners can take them over sooner. The handoff is best effort: its wait is bounded, and if it times out, `releaseAll` attempts to release the remaining locks. A runner that is shutting down no longer acquires new shards, and releasing a shard no longer waits forever on an entity whose id is also active on another shard.
