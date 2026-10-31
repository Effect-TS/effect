---
"effect": patch
---

Fix `ClusterWorkflowEngine` letting a runner that lost its shard delete a newer activity result, which could run the activity again and change the workflow's history.
