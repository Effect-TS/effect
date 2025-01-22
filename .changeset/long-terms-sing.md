---
"effect": patch
---

Improve `UnknownException` error messages

`UnknownException` error messages now include the name of the Effect api that
created the error.

```ts
import { Effect } from "effect"

Effect.tryPromise(() => Promise.reject(new Error("The operation failed"))).pipe(
  Effect.catchAllCause(Effect.logError),
  Effect.runFork
)

// timestamp=2025-01-21T00:41:03.403Z level=ERROR fiber=#0 cause="UnknownException: An unknown error occurred in Effect.tryPromise
//     at fail (.../effect/packages/effect/src/internal/core-effect.ts:1654:19)
//     at <anonymous> (.../effect/packages/effect/src/internal/core-effect.ts:1674:26) {
//   [cause]: Error: The operation failed
//       at <anonymous> (.../effect/scratchpad/error.ts:4:24)
//       at .../effect/packages/effect/src/internal/core-effect.ts:1671:7
// }"
```
