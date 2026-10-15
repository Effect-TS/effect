---
"effect": patch
---

Prevent `WorkflowEngine.layerMemory` from running duplicate compensations after workflow replays, while retaining compensations if replay is interrupted before rebuilding them and preserving ordinary workflow finalizers.
