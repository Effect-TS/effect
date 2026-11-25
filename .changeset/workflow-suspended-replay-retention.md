---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory`. Replays now share a workflow scope while it has no finalizers, so a finalizer or compensation registered late through an earlier run's handle can observe the final run's exit instead of `Exit.void`.
