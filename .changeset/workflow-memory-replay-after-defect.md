---
"effect": patch
---

Fix `WorkflowEngine.layerMemory` running `Workflow.addFinalizer` finalizers before completion when a workflow is resumed after a defect or resumed concurrently.
