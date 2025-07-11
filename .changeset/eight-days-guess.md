---
"effect": minor
---

Add `Layer.mock`

Creates a mock layer for testing purposes. You can provide a partial
implementation of the service, and any methods not provided will
throw an `UnimplementedError` defect when called.

```ts
import { Context, Effect, Layer } from "effect"

class MyService extends Context.Tag("MyService")<
  MyService,
  {
    one: Effect.Effect<number>
    two(): Effect.Effect<number>
  }
>() {}

const MyServiceTest = Layer.mock(MyService, {
  two: () => Effect.succeed(2)
})
```
