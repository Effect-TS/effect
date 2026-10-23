---
"effect": patch
---

Fix `ClusterWorkflowEngine` running a completed step's compensation twice when `interruptUnsafe` interrupts a workflow during a running activity.
