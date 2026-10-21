---
"effect": patch
---

Fix `ClusterWorkflowEngine` losing a `Workflow.interrupt` sent while a run was still saving its `Suspended` reply.
