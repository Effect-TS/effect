---
"effect": patch
---

Fix `ClusterWorkflowEngine` waking a polling parent before a discarded child workflow's result is saved, by writing parent wakes in the same transaction as the child's terminal reply.
