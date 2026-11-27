---
"effect": patch
---

Fix `ClusterWorkflowEngine` waking a polling parent before a discarded child workflow's result is saved, by deferring the parent's `resume` wake with `DeliverAt` until the child's terminal reply is stored.
