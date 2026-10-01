---
"effect": patch
---

Preserve a fiber's `AsyncLocalStorage` context when another fiber wakes or interrupts it. Run `Effect.tryPromise` error handlers in the resumed fiber's context.
