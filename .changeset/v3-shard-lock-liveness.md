---
"@effect/cluster": patch
---

Release shard locks once a shutdown drain exceeds `entityTerminationTimeout`, so a stuck shutdown no longer holds its shards indefinitely.
