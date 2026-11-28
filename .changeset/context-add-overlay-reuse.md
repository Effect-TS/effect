---
"effect": patch
---

Reuse the overlay slot when `Context.add` overwrites a service that was added since the last rebase, so nested `provideService`, `withSpan`, `Effect.fn` and `annotateLogs` calls no longer copy the whole service map every eighth add.
