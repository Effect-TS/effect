---
"@effect/schema": minor
---

POC:

```ts
import { Schema } from "@effect/schema"

class MyLiteralOpaque extends Schema.Literal(1) {}

const MyLiteral = Schema.Literal(2)

const schema = Schema.Struct({ a: MyLiteralOpaque, b: MyLiteral })

export type T = Schema.Schema.Type<typeof schema>

console.log(String(MyLiteral))
```

- remove `asBrandSchema`
- change `BrandSchema` interface

  from

  ```ts
  export interface BrandSchema<A extends brand_.Brand<any>, I>
    extends Annotable<BrandSchema<A, I>, A, I>,
      Brand.Constructor<A> {}
  ```

  to

  ```ts
  export interface BrandSchema<A extends Brand<any>, I, R>
    extends Annotable<BrandSchema<A, I, R>, A, I, R> {
    make(a: Brand.Unbranded<A>): A
  }
  ```

- return `BrandSchema` from `fromBrand`
- add `filter` API interface

  ```ts
  export interface filter<A, I = A, R = never> extends Schema<A, I, R> {
    annotations(annotations: Annotations.Schema<A>): filter<A, I, R>
    make(a: A): A
  }
  ```

  All filters now include a constructor:

  ```ts
  import * as S from "@effect/schema/Schema"

  const MyNumber = S.Number.pipe(S.between(1, 10))

  MyNumber.make(5) // ok
  MyNumber.make(20)
  /*
  throws
  Error: a number between 1 and 10
  └─ Predicate refinement failure
    └─ Expected a number between 1 and 10, actual 20
  */
  ```
