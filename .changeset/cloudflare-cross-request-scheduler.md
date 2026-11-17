---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` so Worker fibers woken by another request resume in the request that owns them, and that request keeps running until they do, within Cloudflare's request lifetime limits.

It is built on the new unstable `Scheduler.ParkingScheduler` extension: a scheduler with `park` and `resume` methods is told where each of its fibers parks, and decides where the fiber runs again. Existing `Scheduler` implementations need no changes.

A fiber of a `ParkingScheduler` that is interrupted after it was woken, but before its scheduler runs it, is interrupted instead of receiving the value it was woken with. An `Effect.callback` that resumes with a resource must release it in its cancellation cleanup, because such a fiber may never receive it.
