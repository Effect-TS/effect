# Native Redis client

`@effect/redis` provides the portable client, protocol, command descriptors,
transactions, and subscriptions. Its only peer dependency is `effect`.
`NodeRedis`, `BunRedis`, and `DenoRedis` provide runtime service layers over the
same TCP, TLS, and Unix socket transport in `@effect/platform-node-shared`.
Standalone, Redis Cluster, and Sentinel are supported.
The acceptance matrix covers Redis 7.2.6 and 8.10.2. RESP2 is the default;
set `protocol: 3` to use RESP3.

The shared Redis package implements protocol and client behavior. Runtime
layers provide both `@effect/redis/RedisClient` and `effect/persistence/Redis`,
plus their own runtime service tag referring to the same client. Bun and Deno
use their Node compatibility APIs for socket integration. Neither adapter uses
Bun's built-in Redis client or `@db/redis`.

TLS trust and hostname checks pass with RSA certificates on Bun 1.4.0 and
Ed25519 certificates on Deno 2.9.4. Bun 1.4.0 rejects the existing Ed25519 test
certificate during handshake; this also reproduces without Redis in `node:tls`.

```ts
import * as NodeRedis from "@effect/platform-node/NodeRedis"
import { RedisClient, RedisCommand } from "@effect/redis"
import { Effect } from "effect"

const program = Effect.gen(function*() {
  const redis = yield* RedisClient.RedisClient
  yield* redis.run(RedisCommand.set("example", "hello"))
  return yield* redis.run(RedisCommand.get("example"))
}).pipe(Effect.provide(NodeRedis.layer({ url: "redis://localhost:6379" })))
```

For Cluster, configure `topology: { _tag: "Cluster", seeds: [{ host, port }] }`.
For Sentinel, configure `topology: { _tag: "Sentinel", sentinels: [{ host,
port }], masterName }`. Sentinel discovery credentials and endpoint TLS belong
to that topology configuration; data-node credentials belong to the outer
client options. `dataTls` configures discovered data-node TLS. `mapAddress`
translates advertised endpoints when required by the deployment.

`execute([command, ...arguments], routing?)` returns lossless tagged RESP
replies. Arguments accept strings or `Uint8Array`. Integers remain `bigint`,
binary strings remain bytes, and RESP3 maps, attributes, and pushes preserve
their wire distinctions. Command descriptors supply checked decoders;
`RedisCommand.make` supports arbitrary Redis and module commands.

Cluster execution infers key positions for common commands. Unknown commands
need explicit `keyIndexes` in the complete argument vector, including the
command at index zero. For example, `OBJECT ENCODING key` uses
`{ keyIndexes: [2] }`. Explicit `{ keyIndexes: [], node }` addresses a node-local
command. SCAN, KEYS, and DBSIZE do not silently aggregate the whole Cluster.
Multi-key operations must use one hash slot.

Pipelines preserve result positions and return each command's checked result
or error. Commands are submitted without waiting for individual replies;
Cluster batches are grouped by destination node and run concurrently. MOVED
and ASK recovery batches only rejected commands, preserving their input order
on each destination connection. Successful commands and commands with unknown
outcomes are never replayed. Slot migration can produce mixed successful and
redirected commands, so a pipeline cannot guarantee global execution order
across nodes. Use
`RedisTransaction.execute` for MULTI/EXEC and optional WATCH work, supplying a
key affinity in Cluster. EXEC errors remain per-command results; a WATCH
conflict returns null. MULTI, queued commands, and EXEC are submitted together
without waiting between commands. Transactions are never automatically replayed.
Watchless transactions with ordinary commands reuse exclusively leased sessions
separate from shared client connections. Concurrent transactions acquire separate
sessions; WATCH and connection-local state use fresh scoped reservations.

Use `reserve({ key?, node? })` for blocking commands, WATCH/MULTI, and
connection-local state. Reservations require a Scope and are discarded when
that scope closes. Shared execution rejects known stateful and blocking
commands. MONITOR, CLIENT REPLY, and QUIT are outside the ordinary request/reply
API and fail explicitly.

Connections default to 4,096 pending commands and 16 MiB of queued request
bytes. Replies are limited to 64 MiB, 128 nesting levels, and 1,000,000 members
per aggregate. Configure these limits on the client when larger payloads are
required. Socket connection and initialization each default to a ten-second
timeout; ordinary commands have no deadline unless `commandTimeout` is set.
Closing a scope destroys its sockets and fails pending work, including
blocking commands, without waiting for their server replies.

`RedisSubscription.make(client, channel, { mode, capacity })` supports channel,
pattern, and sharded subscriptions. Acquisition waits for acknowledgement.
Messages contain binary channel and payload bytes. Subscriptions reconnect
and re-register, including after Sentinel promotion and sharded-slot migration.
Redis Pub/Sub cannot recover messages missed during reconnection. Exceeding
the bounded buffer fails the subscription rather than silently losing data.
Subscriptions also fail when their owning client scope closes, even when the
consumer scope remains open. `client.closed` signals client scope closure.
`reconnectDelay` defaults to 100 milliseconds and must be finite and positive.

After a transport failure, commands that may have reached the server fail with
an `Unknown` outcome and are never automatically replayed. Future operations
can acquire new sessions. Sentinel polling refreshes discovery every five
seconds by default; `refreshInterval` adjusts this. Sentinel role verification
does not provide fencing or a lossless-failover guarantee.

The `effect/persistence/Redis` adapter supports standalone, Cluster, and Sentinel.
Cluster uses hash tags per cache namespace, queue, or rate limiter to keep
related keys in one slot; separate identities can use different slots.
Namespace clear and queue cleanup scan all primary nodes. Script cache misses
execute and cache the script on the key's owning node. Standalone and Sentinel
retain their existing key layouts. Moving existing data into Cluster requires
migrating its keys to the tagged layout.

The previous raw clients and Promise-based `use` helpers in all three adapters
are replaced by native Effect operations. Each module exports `Options`, `make`,
`layer`, and `layerConfig`. Use `run(RedisCommand.get(key))` for a typed result,
or `execute(["GET", key])` for a lossless raw reply. `layer` provides the runtime
tag, general client, and persistence service; `make` returns a scoped client.

Connection settings use `socket.host`, `socket.port`, `socket.path`, and
`socket.tls`; use `database` for the selected database and `protocol` for RESP2/3.
Deno's former `RedisOptions` becomes `DenoRedis.Options`, with `hostname` and
`db` moving to `socket.host` and `database`. URL credentials come from the
authority and the database from the pathname; query parameters do not configure
connections. Explicit options override URL values. Bun's client-specific retry
and idle settings are replaced by the shared client's connection, deadline,
capacity, and recovery settings; commands with uncertain outcomes are never
automatically replayed. Bun subscriptions now reconnect and re-subscribe.
Use `connectTimeout` in place of Bun's `connectionTimeout`. Bun's implicit
`REDIS_URL`/`VALKEY_URL` defaults no longer apply: configure `url` directly or
read it with `layerConfig`. URLs must use `redis:` or `rediss:`.
Layer construction validates the connection and fails with
`@effect/redis/RedisError`, including on Bun. Persistence operations continue
mapping failures into their existing persistence error.

Run the Redis integration tests from the repository root with
`EFFECT_INTEGRATION_TESTS=1 pnpm test --run packages/redis packages/platform/node/test/NodeRedis`.
Set `REDIS_SERVER_BIN=/path/to/redis-server` to use a local binary; otherwise
the fixtures start the pinned Redis image with Docker, which requires Linux
host networking.

The local Node 24.21.0 / Redis 7.2.6 comparison against `redis@5.0.1` establishes
parity within a 5% overhead margin for seven of eight workloads. Sequential
requests remain inconclusive, so overall performance acceptance is incomplete.
See the [measurement protocol and results](../../../.agents/plans/native-redis-throughput.md)
for workloads, confidence intervals, and environment limits.
