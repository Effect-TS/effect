---
"effect": patch
---

Fix `Workflow.intoResult` running workflow finalizers before handler cleanup completes when interrupted immediately after startup.
