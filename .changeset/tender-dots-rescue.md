---
"@effect/schema": patch
---

Equivalence: Fixed a bug related to discriminated tuples.

Example:

The following equivalence check was incorrectly returning `false`:

```ts
import * as E from "@effect/schema/Equivalence"
import * as S from "@effect/schema/Schema"

// Union of discriminated tuples
const schema = S.Union(
  S.Tuple(S.Literal("a"), S.String),
  S.Tuple(S.Literal("b"), S.Number)
)

const equivalence = E.make(schema)

console.log(equivalence(["a", "x"], ["a", "x"]))
// false
```
