---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` and the `Scheduler.preserveAsyncContext` opt-out so shared Worker fibers can resume across requests without request-bound async-context errors.
