# @effect/redis

A native general-purpose Redis client for Effect, with standalone, Cluster,
Sentinel, RESP2/3, transactions, and channel, pattern, and sharded Pub/Sub.
The portable client uses an injected scoped byte connector and has only an
`effect` peer dependency.

## Installation

```sh
npm install effect @effect/redis
```

For Node.js TCP, TLS, and Unix sockets, also install `@effect/platform-node`
and provide its `NodeRedis.layer`:

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

See the [Redis guide](../platform/node/REDIS.md) for topology configuration,
routing, transactions, subscriptions, operational limits, and migration from
node-redis. The acceptance matrix covers Redis 7.2.6 and 8.10.2.
