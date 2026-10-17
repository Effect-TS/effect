---
"@effect/platform-cloudflare": patch
---

Recover Cloudflare cluster entities after a Durable Object restart. An entity holding `Entity.keepAlive` keeps a heartbeat alarm armed, so a deploy, runtime update, or eviction rebuilds it and restores the hold until `Entity.keepAlive(false)`. The same alarm replays unprocessed persisted requests without waiting for a new message. The interval is the new `keepAliveHeartbeat` option on `CloudflareCluster.layer` and `AlchemyCloudflareCluster.make`, 30 seconds by default.
