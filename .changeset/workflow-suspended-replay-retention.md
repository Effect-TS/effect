---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory` by reusing an empty previous run scope, clearing superseded deferred wait tracking, and tracking cluster abandonment by parent scope.
