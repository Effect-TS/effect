---
"effect": patch
---

Fix `ClusterWorkflowEngine` waking a polling parent before a discarded child workflow's result is saved, by waiting in the parent's `resume` handler until the child's terminal reply is stored.
