---
"effect": minor
---

Add Effect.liftPredicate

`Effect.liftPredicate` transforms a `Predicate` function into an `Effect` returning the input value if the predicate returns `true` or failing with specified error if the predicate fails.

```ts
import { pipe, Effect } from "effect";

const isPositive = (n: number): boolean => n > 0;

assert.deepStrictEqual(
  pipe(
    1,
    Effect.liftPredicate(isPositive, (n) => `${n} is not positive`),
  ),
  Effect.succeed(1),
);
assert.deepStrictEqual(
  pipe(
    0,
    Effect.liftPredicate(isPositive, (n) => `${n} is not positive`),
  ),
  Effect.fail("0 is not positive"),
);
```
