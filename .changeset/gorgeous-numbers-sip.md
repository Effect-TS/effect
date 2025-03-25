---
"effect": patch
---

Arbitrary: fix bug where annotations were ignored.

Before

```ts
import { Arbitrary, Schema } from "effect"

const schema = Schema.Int.annotations({
  arbitrary: (_, ctx) => (fc) => {
    console.log("context: ", ctx)
    return fc.integer()
  }
}).pipe(Schema.greaterThan(0), Schema.lessThan(10))

Arbitrary.make(schema)
// No output ❌
```

After

```ts
import { Arbitrary, Schema } from "effect"

const schema = Schema.Int.annotations({
  arbitrary: (_, ctx) => (fc) => {
    console.log("context: ", ctx)
    return fc.integer()
  }
}).pipe(Schema.greaterThan(0), Schema.lessThan(10))

Arbitrary.make(schema)
/*
context:  {
  maxDepth: 2,
  constraints: {
    _tag: 'NumberConstraints',
    constraints: { min: 0, minExcluded: true, max: 10, maxExcluded: true },
    isInteger: true
  }
}
*/
```
