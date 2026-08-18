---
"@effect/platform-cloudflare": minor
"effect": minor
---

Add `CloudflareWorkflowEngine`, running durable workflows on the dedicated
workflow Durable Object class. One workflow execution is one Durable Object:
run state, activity results keyed `${name}/${attempt}`, durable deferred
exits, and the clock due table live on the object's SQLite storage behind its
single alarm. `CloudflareCluster.layer` now also provides the
`WorkflowEngine` service.

Every `DurableClock` is durable on this engine: `DurableClock.sleep` reads its
default in-memory threshold from the new `DurableClock.InMemoryThreshold`
reference, which the Cloudflare engine sets to zero so even sub-minute sleeps
persist a due row and arm the alarm.
