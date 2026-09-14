---
"effect": patch
---

Retain durable deferred completions received before a workflow owner's first local run so replay can complete while the deferred reply is still being persisted.

Release pending completions when their cluster activation deactivates, retain them across handler rebuilds, and prevent an older activation from clearing its replacement's results. Disable the redundant pending cache in the memory workflow engine while preserving its stored deferred results.

Release RPC stream and queue consumers when their request write fiber is interrupted.
