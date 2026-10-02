---
"effect": patch
---

Make `HashRing.getShards` depend only on the current nodes and weights. Previously, fractional weights and colliding point hashes could make rings with the same nodes return different shard assignments depending on the order nodes were added or removed, which could leave cluster shards owned by no runner.
