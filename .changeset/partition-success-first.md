---
"effect": patch
---

`Array`, `Chunk`, `Effect`, and `Record` `partition`, their `separate` helpers, and `Option.partitionMap` now return successes before failures, matching `Stream.partition`. Swap the tuple when moving from the previous `[failures, successes]` order.
