---
"effect": minor
---

Adds Effect.transposeFlatMapOption
```ts
import { Effect, Option, pipe } from "effect"
//          ┌─── Effect<Option<number>, never, never>>
//          ▼
const noneResult = pipe(
  Option.none(),
  Effect.transposeFlatMapOption(() => Effect.succeedSome(42)) // will not be executed
)
console.log(Effect.runSync(noneResult))
// Output: { _id: 'Option', _tag: 'None' }
//          ┌─── Effect<Option<number>, never, never>>
//          ▼
const someSuccessResult = pipe(
  Option.some(42),
  Effect.transposeMapOption((value) => Effect.succeedSome(value 2))
)
console.log(Effect.runSync(someSuccessResult))
// Output: { _id: 'Option', _tag: 'Some', value: 84 }
//          ┌─── Effect<Option<number>, never, never>>
//          ▼
const someSuccessResult = pipe(
  Option.some(42),
  Effect.transposeMapOption((value) => Effect.succeedNone())
)
console.log(Effect.runSync(someSuccessResult))
// Output: { _id: 'Option', _tag: 'None' }
```
