---
"effect": patch
---

Fix `ClusterWorkflowEngine` blocking shard reacquisition indefinitely after a forced shard release interrupted a workflow resume waiting on its active run.
