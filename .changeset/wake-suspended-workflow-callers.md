---
"effect": patch
---

Wake a suspended `WorkflowEngine.execute` caller as soon as its workflow completes, instead of waiting for the next `suspendedRetrySchedule` step. The schedule remains the fallback when the engine cannot observe the completion, such as when another runner saves the reply.
