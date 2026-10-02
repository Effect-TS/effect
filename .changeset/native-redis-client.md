---
"@effect/redis": minor
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"effect": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
---

Add `@effect/redis` with standalone, Cluster, Sentinel, RESP2/3, transactions, and Pub/Sub support. NodeRedis, BunRedis, and DenoRedis share its socket transport, replacing the `redis` and `@db/redis` drivers and Bun's built-in client.

### Breaking changes

- Replace each adapter's raw `client` and Promise-based `use` with Effect operations (`run`, `execute`, and `reserve`) and the new `Options`.
- Rename Deno's `hostname` and `db` to `socket.host` and `database`, and Bun's `connectionTimeout` to `connectTimeout`. Configure Bun's URL explicitly or through `layerConfig`; environment defaults are no longer implicit. URL query parameters and driver-specific options no longer configure connections.
- RESP2 is the default. Layer acquisition validates the connection and can fail with `@effect/redis/RedisError` on every runtime. Commands with uncertain outcomes are never replayed automatically. Bun subscriptions reconnect and re-subscribe. Pipelines and transactions write batches without waiting for individual replies.
- Persistence supports all three topologies. Cluster uses slot-affine keys, so moving existing data into Cluster requires key migration. Standalone and Sentinel keep their existing layouts. Custom `effect/persistence/Redis` services must provide `scan` and `cluster`; `Redis.make` requires `scan` and `scriptHash`. The platform adapters supply these capabilities.
