---
"effect": patch
---

Fix `WorkflowEngine.layerMemory` running `Workflow.addFinalizer` finalizers immediately when a workflow is resumed after a defect, instead of when it completes.
