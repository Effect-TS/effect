---
"@effect/redis": minor
"@effect/platform-node": minor
"effect": minor
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add `@effect/redis`, a native general-purpose client supporting standalone, Cluster, Sentinel, RESP2/3, transactions, and Pub/Sub, and replace NodeRedis's external `redis` dependency.

Migrate `NodeRedis.client` and Promise-based `use` calls to native Effect operations (`run`, `execute`, and `reserve`) with `NodeRedis.Options`; RESP2 is now the default, layer acquisition errors use `@effect/redis/RedisError`, and commands with uncertain outcomes are never automatically replayed. Pipelines and transactions submit batches without waiting for individual replies. Persistence adapters support all three topologies, using slot-affine keys in Cluster; moving existing persisted data into Cluster requires migrating keys, while standalone and Sentinel retain their current layouts.

Custom `effect/persistence/Redis` services must provide `scan` and `cluster`; calls to `Redis.make` must supply `scan` and `scriptHash` implementations. The platform adapters supply these operations explicitly.
