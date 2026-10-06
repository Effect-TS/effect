---
"effect": patch
---

Tag every `effect` module and public export with an explicit `@stability`. Most modules that were not stable in effect 3.x are now `@stability unstable`: new v4 modules such as `Filter`, `Pull`, `Semaphore`, and `TxChunk`, modules that came from 0.x packages such as `FileSystem`, `Path`, and `Terminal`, and modules that were experimental in 3.x such as `ExecutionPlan`, `Graph`, `HashRing`, `LayerMap`, and `PartitionedSemaphore`. All other modules are `@stability stable`. Exports take their module's stability unless they were already tagged.
