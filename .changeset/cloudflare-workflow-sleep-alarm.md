---
"@effect/platform-cloudflare": patch
---

Fix Cloudflare workflow Durable Objects firing an expired resume guard alarm before a `DurableClock.sleep` is due, and clear unused alarms on suspension and completion.
