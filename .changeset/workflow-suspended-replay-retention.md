---
"effect": patch
---

Fix memory retention across suspended workflow replays in `ClusterWorkflowEngine` and `WorkflowEngine.layerMemory` by reusing an empty previous run scope, clearing superseded deferred wait tracking, and tracking cluster abandonment by scope. A late finalizer or compensation attached through a retained earlier handle whose scope was still empty now shares the next run's scope, so if that run terminates without replaying again it observes the terminal exit instead of `Exit.void`.
