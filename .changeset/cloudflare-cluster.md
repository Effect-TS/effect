---
"effect": patch
---

Add the `@effect/platform-cloudflare` package, running Effect Cluster on
Cloudflare Workers and Durable Objects.

One entity instance is one Durable Object with its SQLite storage as the
system of record. The package provides the four Durable Object classes
(entity, workflow, durable queue, singleton), the length-prefixed entity name
encoding, and `CloudflareCluster.layer`, which wires the cluster `Sharding`
service, the `WorkflowEngine`, and the `PersistedQueueFactory` from the
same-Worker namespace bindings. The `Entity`, `Workflow`, `Activity`,
`DurableClock`, `DurableQueue`, `Singleton`, and `ClusterCron` user APIs are
unchanged on this path; every `DurableClock` is durable through the object's
alarm.
