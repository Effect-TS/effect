---
"effect": minor
---

Add `stepOne()` to `ControlledScheduler` that executes exactly one pending task from the highest-priority bucket. Unlike `step()` which drains all tasks at once, `stepOne()` enables fine-grained control over task execution order for deterministic simulation testing and debugging of concurrency issues.
