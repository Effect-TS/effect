---
"effect": patch
---

Keep workflows suspended by `Workflow.SuspendOnFailure` from retrying failed activities until explicitly resumed. Interrupting a failure-suspended workflow now completes it as interrupted without re-running the failed activity.
