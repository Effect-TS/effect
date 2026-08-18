---
"@effect/platform-cloudflare": minor
---

Add `CloudflarePersistedQueue`, running persisted queues on the dedicated
queue Durable Object class. One queue name is one Durable Object: items,
attempt counts, and in-flight leases live on the object's SQLite storage
behind its single alarm, which acts as a watchdog redelivering items whose
worker died before completing them. `CloudflareCluster.layer` now also
provides the `PersistedQueueFactory` service, so the `DurableQueue` user API
works on the Cloudflare path out of the box.
