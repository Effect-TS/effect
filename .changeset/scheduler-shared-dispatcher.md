---
"effect": patch
---

`MixedScheduler` now shares one dispatcher between its fibers instead of creating one per fiber, saving a dispatcher and a `setImmediate` per yielding fiber. Fibers already resume in the async context they captured, so sharing does not leak `AsyncLocalStorage` state between requests. Per-fiber dispatchers are kept on runtimes without `AsyncResource`, on Cloudflare Workers, and for schedulers constructed with a custom `setImmediate`. On Cloudflare Workers the default scheduler now dispatches queued tasks in a microtask, since timers set by a request that has responded never fire.
