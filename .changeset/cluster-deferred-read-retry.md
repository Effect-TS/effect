---
"effect": patch
---

Fix transient storage read errors permanently failing `ClusterWorkflowEngine` workflows that await a `DurableDeferred`.
