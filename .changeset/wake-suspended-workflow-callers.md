---
"effect": patch
---

Wake a suspended `WorkflowEngine.execute` caller as soon as its workflow has a final result, instead of waiting for the next `suspendedRetrySchedule` step. A replay that suspends again does not spend a step of the schedule. With `ClusterWorkflowEngine`, only callers on the runner that owns the execution are woken early; other callers keep relying on `suspendedRetrySchedule`.
