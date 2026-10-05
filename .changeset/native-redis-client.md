---
"@effect/platform-node": minor
"@effect/platform-node-shared": minor
"effect": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
"@effect/platform-browser": minor
"@effect/sql-pglite": patch
---

Add the native Redis client under `effect/redis` and move the native PostgreSQL client from `@effect/sql-pg` to `effect/postgres`. Add native MySQL, SQL Server, ClickHouse, and remote libSQL clients under `effect/mysql`, `effect/mssql`, `effect/clickhouse`, and `effect/libsql`, keeping their existing SQL adapters available. The clients use portable socket, cryptography, and HTTP services without external database drivers. Redis supports standalone, Cluster, Sentinel, RESP2/3, transactions, and Pub/Sub; the Node, Bun, and Deno convenience layers replace their external or built-in Redis drivers.

Add optional RSA-OAEP encryption to Crypto and its runtime providers for MySQL SHA authentication. Add optional socket TLS fragment configuration and handshake framing for certificate-verified SQL Server strict TDS 8 and mandatory TDS 7.4 encryption. Improve repeated PostgreSQL prepared-query throughput and handle buffered TLS write errors during connection shutdown.

### Breaking changes

- Import Redis modules from `effect/redis` and PostgreSQL modules from `effect/postgres`. Provide a runtime `SocketConnector` layer to core Redis layers, and both `SocketConnector` and `Crypto` layers to PostgreSQL and Redis persistence layers. PostgreSQL custom `stream` factories become portable `connector` functions, with Node-compatible streams supported through the platform connector.
- Custom Crypto implementations must support MD5 protocol digests, HMAC and PBKDF2; `Crypto.make` requires HMAC and PBKDF2 primitives. PostgreSQL MD5 and SCRAM authentication helpers now return Effects using Crypto.
- Custom socket readers must provide `run(onChunk)` alongside `pull` and `upgrade`. Use `Socket.makeReader` to derive it from a pull implementation. Receive callbacks can return an Effect to apply backpressure; pulls, receive loops and TLS upgrades cannot overlap.
- Replace Redis adapters' raw `client` and Promise-based `use` with Effect operations (`run`, `execute`, and `reserve`). Deno's `hostname` and `db` become `socket.host` and `database`; Bun's `connectionTimeout` becomes `connectTimeout`. Configure Bun's URL explicitly or through `layerConfig`. TLS settings use portable socket options; keep native TLS options on the platform connector.
- RESP2 is the default. Layer acquisition validates the connection and can fail with `effect/redis/RedisError`. Commands with uncertain outcomes are never replayed automatically. Subscriptions reconnect and re-subscribe; pipelines and transactions batch writes.
- Persistence supports all three topologies. Moving existing data into Cluster requires migrating to slot-affine keys; standalone and Sentinel retain their layouts. Custom persistence Redis services must provide `scan` and `cluster`; `Redis.make` requires `scan` and `scriptHash`.
