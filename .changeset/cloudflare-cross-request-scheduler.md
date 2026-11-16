---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` and `Scheduler.captureAsyncContext` so Worker fibers woken by another request resume in the request that owns them, and that request keeps running until they do, within Cloudflare's request lifetime limits.
