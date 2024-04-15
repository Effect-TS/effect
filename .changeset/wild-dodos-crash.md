---
"@effect/schema": minor
---

Rename Arbitrary.Arbitrary to Arbitrary.LazyArbitrary, rename Arbitrary.make to Arbitrary.makeLazy and introduce Arbitrary.make

Before

```ts
import { Arbitrary, Schema } from "@effect/schema"
import * as fc from "fast-check"

const Person = Schema.struct({
  name: Schema.string,
  age: Schema.string.pipe(Schema.compose(Schema.NumberFromString), Schema.int())
})

const arb = Arbitrary.make(Person)(fc)

console.log(fc.sample(arb, 2))
```

Now

```ts
import { Arbitrary, FastCheck, Schema } from "@effect/schema"

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.String.pipe(Schema.compose(Schema.NumberFromString), Schema.int())
})

const arb = Arbitrary.make(Person)

console.log(FastCheck.sample(arb, 2))
```
