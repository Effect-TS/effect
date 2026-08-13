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

`node-redis` connects explicitly, so both layers connect while being built and now carry `RedisError` in their error channel. By default the initial connection fails on its first connection error. A caller-supplied `socket.reconnectStrategy` overrides this behavior; after the client is ready, the default reconnect strategy uses node-redis' exponential backoff and stops on socket timeouts.

Scope finalization calls `close()`, which waits for in-flight commands, including blocking commands, and can therefore delay scope closure.

**Direct client access**

`NodeRedis.NodeRedis` exposes a RESP2 `RedisClientType` rather than an `ioredis` client. Command methods are camelCase (`client.lRange` instead of `client.lrange`), and arbitrary commands use `client.sendCommand([...])` instead of `client.call(...)`. RESP2 is pinned for stable reply shapes; opting into RESP3 requires an untyped options escape hatch. See the [migration guide](https://redis.io/docs/latest/develop/clients/nodejs/migration/) for the full API comparison.
