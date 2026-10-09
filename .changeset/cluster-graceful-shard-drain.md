---
"effect": patch
---

Release cluster shards one at a time on shutdown so live runners can take them over before the final `releaseAll`, and add `Sharding.drain` to hand every shard off while the runner keeps running.
