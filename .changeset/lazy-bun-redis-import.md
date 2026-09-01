---
"@effect/platform-bun": patch
---

Load Bun's `RedisClient` lazily in `BunRedis`.

The top-level `import ... from "bun"` made `@effect/platform-bun` unimportable outside Bun, since the
barrel re-exports every module. The constructor is now resolved inside the layer's build effect, so the
package can be imported anywhere and only fails where it needs Bun.
