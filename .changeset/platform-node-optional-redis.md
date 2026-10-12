---
"@effect/platform-node": patch
---

Mark the `redis` peer dependency as optional. Only `NodeRedis` uses it, so package managers that install peer dependencies (pnpm, npm 7+) no longer add the Redis client to projects that never import `NodeRedis`.
