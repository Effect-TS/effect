# Native Redis client

`@effect/redis` provides the portable client, protocol, command descriptors,
transactions, and subscriptions. Its only peer dependency is `effect`.
`@effect/platform-node/NodeRedis` supplies Node TCP, TLS, and Unix sockets.
Standalone, Redis Cluster, and Sentinel are supported.
The acceptance matrix covers Redis 7.2.6 and 8.10.2. RESP2 is the default;
set `protocol: 3` to use RESP3.

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
or error. Cluster pipelines execute commands sequentially within each slot,
including redirect recovery, while different slots run concurrently. This
preserves same-slot order with a throughput cost for same-slot batches.
They are not cross-node transactions. Use
`RedisTransaction.execute` for MULTI/EXEC and optional WATCH work, supplying a
key affinity in Cluster. EXEC errors remain per-command results; a WATCH
conflict returns null. Transactions are never automatically replayed.

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

The `effect/persistence/Redis` adapter supports standalone and Sentinel.
Its current key formats and multi-key scripts do not guarantee Cluster slot
affinity, so adapter operations fail explicitly under Cluster. The general
Redis client remains available in that layer.

The previous node-redis client, Promise-based `use`, and `RedisClientOptions`
are replaced by native Effect operations and `NodeRedis.Options`. Socket
settings still live under `socket`; protocol selection uses `protocol`.
Layer construction now fails with `@effect/redis/RedisError`. Persistence
operations continue mapping failures into their existing persistence error.

Run the complete acceptance gate from the repository root with either
`REDIS_SERVER_BIN=/path/to/redis-server node scripts/test-redis.mjs` or
`REDIS_TEST_IMAGE=redis:7.2.6@sha256:43c5c111b5b63afce26faea67198f8cf7e63b941460bcfe1525b68a6ad1eef92 node scripts/test-redis.mjs`.
Docker fixtures require Linux host networking; local binaries use isolated
temporary directories and loopback ports. Both backends clean up their owned
servers. The runner verifies every expected suite executed without skips.
