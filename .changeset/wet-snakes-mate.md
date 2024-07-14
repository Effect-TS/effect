---
"effect": patch
---

add support for `Refinement`s to `Predicate.or`, closes #3243

```ts
import { Predicate } from "effect"

// Refinement<unknown, string | number>
const isStringOrNumber = Predicate.or(Predicate.isString, Predicate.isNumber)
```
