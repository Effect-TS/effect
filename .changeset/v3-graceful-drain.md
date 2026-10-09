---
"@effect/cluster": patch
---

Hand off cluster shards during shutdown after their entities and singletons stop, releasing each lock individually, so live runners can take them over sooner. Only the handoff wait is bounded: if it times out, `releaseAll` attempts to release the remaining locks. A runner that is shutting down no longer acquires new shards, and releasing a shard no longer waits forever on an entity whose id is also active on another shard.
