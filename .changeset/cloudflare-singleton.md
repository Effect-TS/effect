---
"@effect/platform-cloudflare": minor
---

Run cluster singletons on named `Singleton/<name>` Durable Objects. Worker
Cron Triggers can call the object's `wake()` RPC to run the registered effect
once and then allow hibernation; concurrent duplicate wakes are coalesced and
an interrupted wake is recovered through the object's SQLite-backed alarm.
