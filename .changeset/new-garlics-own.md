---
"effect": minor
---

Add `Random.choice`.

```ts
import { Random } from "effect"

Effect.gen(function* () {
  const randomItem = yield* Random.choice([1, 2, 3])
  console.log(randomItem)
})
```
