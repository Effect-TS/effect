---
"effect": patch
---

Allow catchTag to take a { \_tag: literal } argument, propagate tags in static side of errors.

The following is now allowed:

```ts
import { Effect, Data } from "effect"

class ErrorA extends Data.TaggedError("ErrorA")<{}> {}

declare const program: Effect.Effect<number, ErrorA>

const recovery = Effect.catchTag(program, ErrorA, () => Effect.succeed(0))
```
