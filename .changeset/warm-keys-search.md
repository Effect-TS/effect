---
"@effect/platform-node-shared": minor
"@effect/platform-browser": minor
"@effect/opentelemetry": minor
"@effect/platform-node": minor
"@effect/experimental": minor
"@effect/platform-bun": minor
"@effect/platform": minor
"@effect/rpc-http": minor
"effect": minor
"@effect/schema": minor
"@effect/cli": minor
"@effect/rpc": minor
---

This change enables `Effect.serviceConstants` and `Effect.serviceMembers` to access any constant in the service, not only the effects, namely it is now possible to do:

```ts
import { Effect, Context } from "effect";

class NumberRepo extends Context.TagClass("NumberRepo")<
  NumberRepo,
  {
    readonly numbers: Array<number>;
  }
>() {
  static numbers = Effect.serviceConstants(NumberRepo).numbers;
}
```
