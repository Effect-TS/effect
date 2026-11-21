---
"@effect/platform-cloudflare": patch
---

Fix cluster Durable Objects in a jurisdiction reaching objects outside it: `ctx.exports` lookups for parent workflow wakes, scheduled entity replies, and entity keep-alive now use the object's own `ctx.id.jurisdiction`. Add a `jurisdiction` option to `AlchemyCloudflareCluster.make`.
