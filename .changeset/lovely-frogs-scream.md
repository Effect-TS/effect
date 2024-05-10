---
"effect": minor
---

add Effect.functionWithSpan

Allows you to define an effectful function that is wrapped with a span.

```ts
import { Effect } from "effect"

const getTodo = Effect.functionWithSpan({
  body: (id: number) => Effect.succeed(`Got todo ${id}!`),
  options: (id) => ({
    name: `getTodo-${id}`,
    attributes: { id }
  })
})
```
