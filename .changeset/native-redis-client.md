---
"@effect/redis": minor
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"effect": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
---

Add `@effect/redis`, a native general-purpose client supporting standalone, Cluster, Sentinel, RESP2/3, transactions, and Pub/Sub. NodeRedis, BunRedis, and DenoRedis use the same client and shared socket transport, replacing the external `redis` and `@db/redis` integrations and Bun's built-in Redis client.

Reduce per-command allocations and idle socket write overhead for sequential requests while retaining batched pipeline execution.

### Breaking changes

- Migrate each adapter's raw `client` and Promise-based `use` to native Effect operations (`run`, `execute`, and `reserve`) and its new `Options`. Deno's `hostname` and `db` become `socket.host` and `database`; Bun's `connectionTimeout` becomes `connectTimeout`. Configure Bun's URL explicitly or through `layerConfig` instead of relying on implicit environment defaults. URL query parameters and former driver-specific options no longer configure connections.
- RESP2 is the default, layer acquisition validates the connection and can fail with `@effect/redis/RedisError` on all runtimes, and commands with uncertain outcomes are never automatically replayed. Bun subscriptions now reconnect and re-subscribe. Pipelines and transactions submit batches without waiting for individual replies.
- Persistence supports all three topologies. Cluster uses slot-affine keys, so moving existing persisted data into Cluster requires key migration; standalone and Sentinel retain their current layouts. Custom `effect/persistence/Redis` services must provide `scan` and `cluster`, and `Redis.make` requires `scan` and `scriptHash` implementations. The platform adapters supply these capabilities.
