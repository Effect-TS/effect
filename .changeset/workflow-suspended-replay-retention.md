---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory` by allocating per-run child scopes lazily on first access and clearing superseded run deferred tracking.
