---
"effect": patch
---

Fix `ClusterWorkflowEngine` waking a polling parent before a discarded child workflow's terminal reply is saved, by persisting parent wakeups in the same storage transaction as the child's exit reply.
