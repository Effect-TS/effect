---
"effect": patch
---

Fix `ClusterWorkflowEngine` turning transient storage failures while saving durable clocks or deferred completions into workflow defects; they are now retried.
