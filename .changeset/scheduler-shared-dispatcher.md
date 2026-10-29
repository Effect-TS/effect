---
"effect": patch
---

Share one `MixedScheduler` dispatcher between fibers. Fibers now resume in the async context they suspended in, so they no longer need a dispatcher each to keep `AsyncLocalStorage` stores apart. A fiber that yields no longer allocates its own dispatcher or arms its own timer, and queued tasks from different fibers are ordered by priority together. Schedulers created with a custom `setImmediate`, and schedulers on Cloudflare Workers, still give each fiber its own dispatcher, because those callbacks can belong to a request and be dropped with it. When a queued task throws, the tasks after it stay queued instead of being lost.
