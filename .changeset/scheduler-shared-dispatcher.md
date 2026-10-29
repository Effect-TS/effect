---
"effect": patch
---

Share one `MixedScheduler` dispatcher between the fibers of a fiber tree. Fibers resume in the async context they suspended in, so they no longer need a dispatcher each to keep `AsyncLocalStorage` stores apart. A fiber that yields no longer allocates its own dispatcher or arms its own timer, and queued tasks from fibers in the same tree are ordered by priority together. Separate root fibers keep separate dispatchers. `MixedScheduler.makeDispatcher()` still returns a new dispatcher on every call, and custom schedulers still get one `makeDispatcher()` call per fiber. When a queued task throws, the tasks after it stay queued instead of being lost.

If the runtime refuses to re-enter a suspended fiber's async context when it is woken, the error is thrown to the waker and the fiber stays suspended in its own context, so it can still be resumed or interrupted later.
