---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` and `Scheduler.captureAsyncContext` so Worker fibers woken by a later request resume in the request that owns them.
