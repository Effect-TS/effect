---
"effect": patch
---

Add functional analogue of `satisfies` operator.
This is a convenient operator to use in the `pipe` chain to localize type errors closer to their source.

```ts
import { satisfies } from "effect/Function"

const test1 = satisfies<number>()(5 as const)
      // ^? const test: 5
const test2 = satisfies<string>()(5)
      // ^? Argument of type 'number' is not assignable to parameter of type 'string'

assert.deepStrictEqual(satisfies<number>()(5), 5)
```
