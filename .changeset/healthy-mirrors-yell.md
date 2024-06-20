---
"effect": minor
---

Add Effect.liftPredicate

`Effect.liftPredicate` transforms a `Predicate` function into an `Effect` returning the input value if the predicate returns `true` or failing with specified error if the predicate fails.

```ts
import { Effect } from "effect";

const isPositive = (n: number): boolean => n > 0;

// succeeds with `1`
Effect.liftPredicate(1, isPositive, (n) => `${n} is not positive`);

// fails with `"0 is not positive"`
Effect.liftPredicate(0, isPositive, (n) => `${n} is not positive`);
```
