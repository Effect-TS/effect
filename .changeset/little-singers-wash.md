---
"effect": minor
---

Introduce ReadonlyTag as the covariant side of a tag, enables:

```ts
import type { Context } from "effect"
import { Effect } from "effect"

export class MyRequirement extends Effect.Service<MyRequirement>()(
  "MyRequirement",
  { succeed: () => 42 }
) {}

export class MyUseCase extends Effect.Service<MyUseCase>()("MyUseCase", {
  dependencies: [MyRequirement.Default],
  effect: Effect.gen(function* () {
    const requirement = yield* MyRequirement
    return Effect.fn("MyUseCase.execute")(function* () {
      return requirement()
    })
  })
}) {}

export function effectHandler<I, Args extends Array<any>, A, E, R>(
  service: Context.ReadonlyTag<I, (...args: Args) => Effect.Effect<A, E, R>>
) {
  return Effect.fn("effectHandler")(function* (...args: Args) {
    const execute = yield* service
    yield* execute(...args)
  })
}

export const program = effectHandler(MyUseCase)
```
