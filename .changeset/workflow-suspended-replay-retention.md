---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory`. Each run's workflow scope is now created on first use, so run scopes close in reverse order of first use instead of reverse run order.
