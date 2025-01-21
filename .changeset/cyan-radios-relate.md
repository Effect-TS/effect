---
"effect": minor
---

Add `Effect.transposeOption`, closes #3142.

Converts an `Option` of an `Effect` into an `Effect` of an `Option`.

**Details**

This function transforms an `Option<Effect<A, E, R>>` into an
`Effect<Option<A>, E, R>`. If the `Option` is `None`, the resulting `Effect`
will immediately succeed with a `None` value. If the `Option` is `Some`, the
inner `Effect` will be executed, and its result wrapped in a `Some`.

**Example**

```ts
import { Effect, Option } from "effect"

//      ┌─── Option<Effect<number, never, never>>
//      ▼
const maybe = Option.some(Effect.succeed(42))

//      ┌─── Effect<Option<number>, never, never>
//      ▼
const result = Effect.transposeOption(maybe)

console.log(Effect.runSync(result))
// Output: { _id: 'Option', _tag: 'Some', value: 42 }
```
