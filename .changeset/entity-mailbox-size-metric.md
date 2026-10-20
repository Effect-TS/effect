---
"effect": patch
"@effect/opentelemetry": patch
---

Add `Metric.remove`, `Metric.removeUnsafe` and `Metric.registerUnsafe` for removing series and registering series whose value is read on snapshot. The OTLP and OpenTelemetry exporters now drop delta state for series that are no longer registered. Add the opt-in `ClusterMetrics.entityMailboxSize` gauge, enabled with `ShardingConfig.entityMailboxMetrics` or the `mailboxMetrics` entity option, which reports the mailbox size of each resident entity and removes the series when the entity is released.
