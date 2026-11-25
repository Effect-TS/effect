---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory` by detaching empty child scopes on suspension and clearing superseded run deferred tracking.
