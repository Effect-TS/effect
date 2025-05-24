---
"effect": minor
---

Add parameter support for Effect.Service

This allows you to pass parameters to the `effect` & `scoped` Effect.Service
constructors, which will also reflects in the `.Default` layer.

```ts
import type { Layer } from "effect"
import { Effect } from "effect"

class NumberService extends Effect.Service<NumberService>()("NumberService", {
  // You can now pass a function to the `effect` and `scoped` constructors
  effect: Effect.fn(function* (input: number) {
    return {
      get: Effect.succeed(`The number is: ${input}`)
    } as const
  })
}) {}

// Pass the arguments to the `Default` layer
const CoolNumberServiceLayer: Layer.Layer<NumberService> =
  NumberService.Default(6942)
```
