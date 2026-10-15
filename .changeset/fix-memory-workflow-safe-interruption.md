---
"effect": patch
---

Align safe interruption in `WorkflowEngine.layerMemory` with the cluster engine: workflows that finish without suspending now complete normally instead of being interrupted and running compensation. Preserve unsafe interruption across suspended replays.
