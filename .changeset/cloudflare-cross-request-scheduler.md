---
"effect": minor
"@effect/platform-cloudflare": minor
---

Add `CloudflareScheduler` and a required `Scheduler.park` method so Worker fibers woken by another request resume in the request that owns them, and that request keeps running until they do, within Cloudflare's request lifetime limits.

Custom `Scheduler` implementations must now implement `park`. To keep the default behaviour, extend `MixedScheduler`, overriding only what changes, or delegate to one. `MixedScheduler#makeDispatcher` now returns `SchedulerDispatcher`, so subclasses can return their own dispatcher.

```ts
const scheduler = new class extends Scheduler.MixedScheduler {
  override shouldYield(fiber: Fiber.Fiber<unknown, unknown>): boolean {
    return fiber.currentOpCount > 100
  }
}()
```

An interrupt requested while a fiber is suspended now takes effect even if the fiber was woken with a value first. An `Effect.callback` that resumes with a resource must release it in its cancellation cleanup, because the fiber may never receive it.
