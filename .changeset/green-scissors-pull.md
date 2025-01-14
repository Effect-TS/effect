---
"effect": patch
---

Fix: Correct `Arbitrary.make` to support nested `TemplateLiteral`s.

Previously, `Arbitrary.make` did not properly handle nested `TemplateLiteral` schemas, resulting in incorrect or empty outputs. This fix ensures that nested template literals are processed correctly, producing valid arbitrary values.

**Before**

```ts
import { Arbitrary, FastCheck, Schema as S } from "effect"

const schema = S.TemplateLiteral(
  "<",
  S.TemplateLiteral("h", S.Literal(1, 2)),
  ">"
)

const arb = Arbitrary.make(schema)

console.log(FastCheck.sample(arb, { numRuns: 10 }))
/*
Output:
[
  '<>', '<>', '<>',
  '<>', '<>', '<>',
  '<>', '<>', '<>',
  '<>'
]
*/
```

**After**

```ts
import { Arbitrary, FastCheck, Schema as S } from "effect"

const schema = S.TemplateLiteral(
  "<",
  S.TemplateLiteral("h", S.Literal(1, 2)),
  ">"
)

const arb = Arbitrary.make(schema)

console.log(FastCheck.sample(arb, { numRuns: 10 }))
/*
Output:
[
  '<h2>', '<h2>',
  '<h2>', '<h2>',
  '<h2>', '<h1>',
  '<h2>', '<h1>',
  '<h1>', '<h1>'
]
*/
```
