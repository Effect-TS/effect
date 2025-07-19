---
"effect": minor
---

Added Effect.tapExit for tapping the Exit of an Effect.

```ts
Effect.succeed(11).pipe(Effect.tapExit(
  Exit.match({
    onFailure: Effect.logError,
    onSuccess: Effect.log // logs 11
  })
))
```
