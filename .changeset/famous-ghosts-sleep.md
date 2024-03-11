---
"@effect/schema": patch
---

## `Schema` module

- enhance the `struct` API to allow records:
  ```ts
  const schema1 = S.struct({ a: S.number }, { key: S.string, value: S.number });
  // or
  const schema2 = S.struct({ a: S.number }, S.record(S.string, S.number));
  ```
- enhance the `extend` API to allow nested (non-overlapping) fields:
  ```ts
  const A = S.struct({ a: S.struct({ b: S.string }) });
  const B = S.struct({ a: S.struct({ c: S.number }) });
  const schema = S.extend(A, B);
  /*
  same as:
  const schema = S.struct({
    a: S.struct({
      b: S.string,
      c: S.number
    })
  })
  */
  ```
- add `Annotable` interface
- add `asSchema`
- add add `Schema.Any`, `Schema.All`, `Schema.AnyNoContext` helpers
- refactor `annotations` API to be a method within the `Schema` interface
- add support for `AST.keyof`, `AST.getPropertySignatures`, `Parser.getSearchTree` to Classes
- fix `BrandAnnotation` type and add `getBrandAnnotation`
- add `annotations?` parameter to Class constructors:

  ```ts
  import * as AST from "@effect/schema/AST";
  import * as S from "@effect/schema/Schema";

  class A extends S.Class<A>()(
    {
      a: S.string,
    },
    { description: "some description..." } // <= annotations
  ) {}

  console.log(AST.getDescriptionAnnotation((A.ast as AST.Transform).to));
  // => { _id: 'Option', _tag: 'Some', value: 'some description...' }
  ```
