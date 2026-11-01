---
"effect": patch
---

Fix `ClusterWorkflowEngine` failing a workflow with a defect when a transient storage failure, such as a dropped database connection, interrupts saving a `DurableClock.sleep` clock or a `DurableDeferred` completion, including a `DurableDeferred.raceAll` winner.
