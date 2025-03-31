---
"effect": minor
---

`Match.tagsTupleExhaustive` has been added

```ts
import { Either, Match, Option } from "effect"

Match.value([Option.some(1), Either.left(33)]).pipe(
  Match.tagsTupleExhaustive({
    NoneLeft: (none, left) => {}, // (none: None<number>, left: Left<number, never>) => void
    NoneRight: (none, right) => {}, // (none: None<number>, left: Right<number, never>) => void
    SomeLeft: (some, left) => {}, // (none: Some<number>, left: Left<number, never>) => void
    SomeRight: (some, right) => {} // (none: Some<number>, left: Right<number, never>) => void
  })
)
```
