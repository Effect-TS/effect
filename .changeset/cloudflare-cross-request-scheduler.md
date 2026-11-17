---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` so Worker fibers woken by another request resume in the request that owns them, and that request keeps running until they do, within Cloudflare's request lifetime limits.

It is built on the new unstable `Scheduler.ParkingScheduler` extension: a scheduler with a `park` method starts a `Scheduler.Wait` for each fiber that suspends, and decides how the fiber resumes. The wait keeps resuming the fiber if `Fiber.setContext` replaces its scheduler. Existing `Scheduler` implementations need no changes and keep the default behaviour.

An interrupt requested while a fiber is suspended now takes effect even if the fiber was woken with a value first. An `Effect.callback` that resumes with a resource must release it in its cancellation cleanup, because the fiber may never receive it.
