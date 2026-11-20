---
"effect": patch
---

Fix `Workflow.addFinalizer` finalizers running before the workflow ends when a durable timer or deferred completes while another step is still running.
