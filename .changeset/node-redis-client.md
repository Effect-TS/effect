---
"@effect/platform-node": patch
---

Migrate `NodeRedis` from `ioredis` to the `redis` (node-redis) client.

`ioredis` is deprecated in favour of [`node-redis`](https://redis.io/docs/latest/develop/clients/nodejs/), so `NodeRedis` now builds on it. Replace the `ioredis` peer dependency with `redis`:

```sh
npm uninstall ioredis && npm install redis
```

**Connection options**

`NodeRedis.layer` and `NodeRedis.layerConfig` now take node-redis' `RedisClientOptions` instead of ioredis' `RedisOptions`. Socket settings move under `socket`, and `db` is renamed to `database`:

```ts
// before
NodeRedis.layer({ host: "localhost", port: 6379, db: 1 })

// after
NodeRedis.layer({ socket: { host: "localhost", port: 6379 }, database: 1 })
```

A `url` can be used instead: `NodeRedis.layer({ url: "redis://localhost:6379/1" })`.

**Layer construction can now fail**

`node-redis` connects explicitly, so both layers connect while being built and now carry `RedisError` in their error channel. By default `node-redis` retries the initial connection indefinitely; pass `socket: { reconnectStrategy: false }` to fail on the first connection error instead.

**Direct client access**

`NodeRedis.NodeRedis` exposes a `RedisClientType` rather than an `ioredis` client. Command methods are camelCase (`client.lRange` instead of `client.lrange`), arbitrary commands use `client.sendCommand([...])` instead of `client.call(...)`, and node-redis 6 speaks RESP3 by default — pass `RESP: 2` to keep RESP2 reply shapes. See the [migration guide](https://redis.io/docs/latest/develop/clients/nodejs/migration/) for the full API comparison.
