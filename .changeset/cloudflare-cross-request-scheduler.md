---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` so Worker fibers woken by another request resume in the request that owns them, and that request keeps running until they do, within Cloudflare's request lifetime limits.

It is built on the new unstable `Scheduler.ParkingScheduler` extension: a scheduler with `park` and `resume` methods decides how its fibers resume after they suspend. Existing `Scheduler` implementations need no changes and keep the default behaviour.

An interrupt requested while a fiber is suspended now takes effect even if the fiber was woken with a value first. An `Effect.callback` that resumes with a resource must release it in its cancellation cleanup, because the fiber may never receive it.
