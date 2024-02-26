---
"@effect/schema": patch
---

- Schema: add `AnySchema` helper

- Schema: refactor `annotations` API to be a method within the `Schema` interface

- add support for `AST.keyof`, `AST.getPropertySignatures`, `Parser.getSearchTree` to Classes

- AST: fix `BrandAnnotation` type and add `getBrandAnnotation`

- add `annotations?` parameter to Class constructors

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
