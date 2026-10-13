---
"effect": patch
---

Keep a workflow suspended by `Workflow.SuspendOnFailure` parked until it is explicitly resumed or interrupted, in both the in-memory and cluster workflow engines.

Previously a child workflow completion (including a child started with `discard: true`), a durable deferred, or a `DurableClock` could wake a failure-suspended execution and replay its failed activity. Only `resume` and `interrupt` now wake it. This is a behavior change: code that relied on one of those completions to retry a failed activity must call `resume` instead.

`Workflow.Suspended` gains an optional `failed` field that records when an execution's own `SuspendOnFailure` fired. A cause inherited from a suspended child does not set it, so a parent still wakes when that child is resumed and completes. Suspended replies persisted before this change have no `failed` field and keep the previous wake behavior until they run again.

Interrupting a failure-suspended execution now completes it as interrupted instead of suspending it again.
