---
"effect": patch
---

Prevent `WorkflowEngine.layerMemory` from running duplicate compensations after workflow replays. Compensated steps are identified by the durable operations they run, so concurrent replays keep each step's compensation, and compensations are retained if replay is interrupted before rebuilding them. Ordinary workflow finalizers are preserved.
