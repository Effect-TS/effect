---
"effect": patch
---

Fix `Workflow.intoResult` closing the workflow scope before an interrupted handler finished its cleanup.
