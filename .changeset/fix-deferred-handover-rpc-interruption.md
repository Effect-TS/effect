---
"effect": patch
---

Retain durable deferred completions received before a workflow owner's first local run so replay can complete while the deferred reply is still being persisted.

Release pending completions when cluster entities deactivate, and disable the redundant pending cache in the memory workflow engine while preserving its stored deferred results.

Release RPC stream and queue consumers when their request write fiber is interrupted.
