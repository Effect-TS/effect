---
"effect": patch
---

Fix `ClusterWorkflowEngine` turning transient storage failures while starting a child workflow into a parent workflow defect; they are now retried.
