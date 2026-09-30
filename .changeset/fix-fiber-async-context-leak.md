---
"effect": patch
---

Resume fibers in their own `AsyncLocalStorage` context when another fiber wakes or interrupts them, such as a `Pool` waiter, a `Deferred` awaiter or a joined fiber. Like `await`, a fiber resumes in the context it had when it suspended, including stores set with `enterWith`. The `Effect.tryPromise` `catch` function also runs in that context.
