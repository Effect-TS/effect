---
"effect": patch
---

Fix `ClusterWorkflowEngine` running a completed step's compensation twice when `interruptUnsafe` interrupts a workflow during a running activity. The cut-off run is now superseded by the replay that records the interrupt, so its finalizers observe success and only the final run observes the interrupt.
