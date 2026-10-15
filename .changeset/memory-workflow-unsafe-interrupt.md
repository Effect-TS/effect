---
"effect": patch
---

Fix `WorkflowEngine.layerMemory` so `interruptUnsafe` completes running and suspended workflows with an interrupted exit without requiring an external wake.
