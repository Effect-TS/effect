---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add `Redis.reserve`, which leases a dedicated connection from a pool, so blocking commands like `XREAD BLOCK` and `BLPOP` no longer hold up other commands on the shared connection. `NodeRedis`, `BunRedis` and `DenoRedis` layers accept `maxConnections`, `minConnections`, `idleTimeout` and `acquireTimeout` to size the pool.

`Redis.make` now requires a `connect` option, and hand-written `Redis` services need a `reserve` member.
