---
"effect": patch
---

Fix `Workflow.execute` with `{ discard: true }` being interrupted before dispatch when a sibling suspends on a durable wait.
