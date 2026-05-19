---
"@effect/workflow": patch
---

Forward the parent pointer when spawning a child workflow with `discard: true`.

`Workflow.execute(payload, { discard: true })` took a fast path inside `WorkflowEngine.execute` that omitted the `parent` option when delegating to the underlying engine. As a result, the cluster engine never wrote `"~@effect/workflow/parent"` into the child's persisted payload, breaking causality tracking for fire-and-forget fan-outs (the common pattern for batching workflows over many items). Discarded children now carry the same parent pointer that non-discarded children already did, so observability tools can link them back to their parent.
