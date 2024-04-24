---
"@effect/schema": minor
---

POC:

- add `SchemaClass` interface
- add `AnnotableClass` interface
- make schemas extendable

  ```ts
  import { Schema as S } from "@effect/schema"

  class A extends S.Struct({
    name: S.String
  }) {}

  class B extends S.Struct({
    a: A
  }) {
    static decodeUnknownSync(u: unknown) {
      return S.decodeUnknownSync(this)(u)
    }
  }

  // const U: S.Union<[typeof A, typeof B]>
  export const U = S.Union(A, B)

  console.log(B.decodeUnknownSync({}))
  /*
  Error: { a: { name: string } }
  └─ ["a"]
   └─ is missing
  */
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
    extends AnnotableClass<BrandSchema<A, I, R>, A, I, R> {
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
