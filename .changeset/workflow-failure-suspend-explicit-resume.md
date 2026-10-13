---
"effect": patch
---

Keep workflows suspended by `Workflow.SuspendOnFailure` suspended until `resume` or `interrupt` is called, in both engines. Child, deferred and clock completions no longer retry failed activities automatically.

The optional `Workflow.Suspended.failed` field distinguishes these failures from inherited child failures, which still allow automatic wakes. Persisted replies without this field keep the old wake behavior until they run again.

Interrupting a failure-suspended execution now completes it as interrupted instead of suspending it again.
