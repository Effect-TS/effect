# @effect/redis

A native Redis client for Effect, supporting standalone servers, Redis Cluster,
Sentinel, RESP2 and RESP3, transactions, and channel, pattern, and sharded
Pub/Sub. The client talks to Redis through an injected byte transport and has
only an `effect` peer dependency.

`NodeRedis` (`@effect/platform-node`), `BunRedis`, and `DenoRedis` provide that
transport over TCP, TLS, and Unix sockets, together with the
`effect/persistence/Redis` adapter.

## Installation

```sh
npm install effect @effect/redis @effect/platform-node
```

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

## Topologies

RESP2 is the default; set `protocol: 3` for RESP3.

For Cluster, configure `topology: { _tag: "Cluster", seeds: [{ host, port }] }`.
For Sentinel, configure `topology: { _tag: "Sentinel", sentinels: [{ host, port }], masterName }`.
Sentinel credentials and TLS belong to the topology configuration, while
data-node credentials belong to the client options. `dataTls` configures TLS
for discovered data nodes, and `mapAddress` translates advertised addresses.
Sentinel discovery is refreshed every five seconds by default
(`refreshInterval`). It verifies the primary's role but provides no fencing.

## Commands

`execute([command, ...args], routing?)` returns the raw RESP reply. Arguments
are strings or `Uint8Array`s, integers are `bigint`s, and binary strings stay
bytes. `run(command)` decodes the reply with a typed command;
`RedisCommand.make` describes any Redis or module command.

In Cluster, key positions are inferred for common commands. Other commands need
`keyIndexes` into the full argument list, including the command name at index
zero (for example `{ keyIndexes: [2] }` for `OBJECT ENCODING key`).
`{ keyIndexes: [], node }` targets one node. Keys used together must share a
hash slot. `SCAN`, `KEYS`, and `DBSIZE` are not aggregated across the Cluster.

Pipelines write each node's commands together and return one result per
command. Only commands rejected with MOVED or ASK are retried, so a pipeline
spanning nodes has no global order.

Commands that may have reached the server before a connection failed fail with
an `Unknown` outcome and are never replayed. Later commands use a new
connection.

## Dedicated sessions

`reserve({ key?, node? })` acquires a connection for the current scope. Use it
for blocking commands, `WATCH`, and connection-local state; the shared
connections reject those commands. `MONITOR`, `CLIENT REPLY`, and `QUIT` are not
supported.

`RedisTransaction.execute` writes MULTI, the commands, and EXEC together on a
dedicated session, optionally after a `watch` step on that session. Command
errors are returned per position, and a WATCH conflict returns `null`.
Transactions are never replayed.

## Pub/Sub

`RedisSubscription.make(client, channel, { mode, capacity })` subscribes on a
dedicated connection and returns once Redis acknowledges the subscription.
Subscriptions reconnect after connection loss, Sentinel failover, and sharded
slot migration (every `reconnectDelay`, 100 milliseconds by default), but
messages published in the meantime are lost. Exceeding `capacity` fails the
subscription instead of dropping messages, and closing the client fails it with
a `Closed` error.

## Limits

Connections allow 4,096 pending commands and 16 MiB of unsent request bytes.
Replies are limited to 64 MiB, 128 levels of nesting, and 1,000,000 members per
aggregate. Connecting and connection setup each time out after ten seconds;
commands have no deadline unless `commandTimeout` is set. Closing a scope
closes its sockets and fails pending commands, including blocking ones.

## Persistence

The `effect/persistence/Redis` adapter supports all three topologies. In
Cluster it adds a hash tag per cache namespace, queue, or rate limiter so that
related keys share a slot; standalone and Sentinel keep their existing key
layout. Moving persisted data into Cluster therefore requires migrating keys.

## Migrating from the previous adapters

`NodeRedis`, `BunRedis`, and `DenoRedis` no longer expose a driver client or a
Promise-based `use`. Each exports `Options`, `make`, `layer`, and `layerConfig`,
and `layer` provides the runtime tag, `RedisClient`, and the persistence service.

Connections are configured with `url` or `socket.host`, `socket.port`,
`socket.path`, and `socket.tls`, plus `database` and `protocol`. URL credentials
come from the authority and the database from the path; query parameters are
ignored, and explicit options override the URL. URLs must use `redis:` or
`rediss:`.

- Deno: `hostname` and `db` become `socket.host` and `database`.
- Bun: `connectionTimeout` becomes `connectTimeout`, and `REDIS_URL` /
  `VALKEY_URL` are no longer read implicitly. Subscriptions now reconnect.

Building a layer connects to Redis and fails with `@effect/redis/RedisError`
when it cannot.

## Testing

Run the integration tests from the repository root with
`EFFECT_INTEGRATION_TESTS=1 pnpm test --run packages/redis packages/platform/node/test/NodeRedis`.
Set `REDIS_SERVER_BIN` to a `redis-server` binary to use it; otherwise the
fixtures run the pinned Redis Docker image, which requires Linux host
networking.
