---
"effect": patch
---

Tag every `effect` module with an explicit `@stability`. Modules that were not stable in effect 3.x are now `@stability unstable`: new v4 modules such as `Filter`, `Optic`, `Pull`, `Semaphore`, `SchemaGetter`, and `TxChunk`, modules that came from 0.x packages such as `FileSystem`, `Path`, `Terminal`, `Combiner`, and `Reducer`, and modules that were experimental in 3.x such as `ExecutionPlan`, `Graph`, `HashRing`, `LayerMap`, and `PartitionedSemaphore`. All other modules are `@stability stable`.
