---
"effect": patch
---

Prevent `WorkflowEngine.layerMemory` from running duplicate compensations after workflow replays. Each replay now starts with a fresh workflow scope, as with the cluster engine, so only the final run's compensations run.

Finalizers registered in runs that suspended still run once the execution finishes, in the same order, but they now observe `Exit.void` instead of the execution's final exit.
