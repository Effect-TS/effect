---
"@effect/schema": minor
---

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
  export interface BrandSchema<A extends brand_.Brand<any>, I, R>
    extends Annotable<BrandSchema<A, I, R>, A, I, R> {
    (a: brand_.Brand.Unbranded<A>): A
  }
  ```

- add `filter` API interface

  ```ts
  export interface filter<A, I = A, R = never> extends Schema<A, I, R> {
    (a: A): A
    annotations(annotations: Annotations.Schema<A>): filter<A, I, R>
  }
  ```

  All filters now include a constructor:

  ```ts
  import * as S from "@effect/schema/Schema"

  const MyNumber = S.Number.pipe(S.between(1, 10))

  MyNumber(5) // ok
  MyNumber(20)
  /*
  throws
  Error: a number between 1 and 10
  └─ Predicate refinement failure
    └─ Expected a number between 1 and 10, actual 20
  */
  ```
