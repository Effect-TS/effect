---
"effect": patch
---

Share one `MixedScheduler` dispatcher between fibers. Fibers resume in the async context they suspended in, so they no longer need a dispatcher each to keep `AsyncLocalStorage` stores apart. A fiber that yields no longer allocates its own dispatcher or arms its own timer, and queued tasks from different fibers are ordered by priority together. `MixedScheduler.makeDispatcher()` still returns a new dispatcher on every call, so callbacks scheduled on it directly keep running in the context that armed them. Custom schedulers, schedulers created with a custom `setImmediate`, and schedulers on Cloudflare Workers keep one dispatcher per fiber, because their callbacks can belong to a request and be dropped with it. When a queued task throws, the tasks after it stay queued instead of being lost.

On Cloudflare Workers, a fiber woken or interrupted by another request now continues in its own request with its own `AsyncLocalStorage` store, and its finalizers run there too. Before, the waking request failed with "Cannot call this AsyncLocalStorage bound function outside of the request in which it was created" and the woken fiber never resumed.
