---
"effect": patch
---

Retain durable deferred completions received before a workflow owner's first local run so replay can complete while the deferred reply is still being persisted.

Keep pending completions in a cache keyed weakly by cluster activation. Handler rebuilds retain completions, and overlapping activations cannot clear each other's results. Results can be collected once their activation scope becomes unreachable; closing a scope alone does not guarantee collection.

Release RPC stream and queue consumers when their request write fiber is interrupted.
