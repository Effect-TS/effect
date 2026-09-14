---
"effect": patch
---

Retain durable deferred completions received before a workflow owner's first local run so replay can complete while the deferred reply is still being persisted.

Release RPC stream and queue consumers when their request write fiber is interrupted.
