---
"effect": patch
---

Fix `Workflow.addFinalizer` running before completion when a durable timer or deferred wakes an active workflow.
