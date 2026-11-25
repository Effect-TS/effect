---
"effect": patch
---

Fix cluster shard rebalancing stalling handlers and workflows until `entityTerminationTimeout` when waiting on persisted requests addressed to the releasing shard.
