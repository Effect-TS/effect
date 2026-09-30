---
"@effect/redis": minor
"@effect/platform-node": minor
---

Add `@effect/redis`, a native general-purpose client supporting standalone, Cluster, Sentinel, RESP2/3, transactions, and Pub/Sub, and replace NodeRedis's external `redis` dependency.

Migrate `NodeRedis.client` and Promise-based `use` calls to native Effect operations (`run`, `execute`, and `reserve`) with `NodeRedis.Options`; RESP2 is now the default, layer acquisition errors use `@effect/redis/RedisError`, and commands with uncertain outcomes are never automatically replayed. Existing persistence adapters support standalone and Sentinel and explicitly reject Cluster operations because their key formats do not guarantee slot affinity.
