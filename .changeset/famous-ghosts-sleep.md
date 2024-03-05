---
"@effect/schema": patch
---

- Schema: enhance the `extend` API to allow nested (non-overlapping) fields:

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

- Schema: add `Annotable` interface

- Schema: add `asSchema`

- Schema: expose `literals` (`literal` API)

  ```ts
  import * as S from "@effect/schema/Schema";

  // const literals: readonly ["a", "b"]
  const literals = S.literal("a", "b").literals;
  ```

- Schema: expose `fields` (`struct` API)

  ```ts
  import * as S from "@effect/schema/Schema";

  const Person = S.struct({
    name: S.string,
    age: S.number,
  });

  /*
  const personFields: {
      a: S.Schema<string, string, never>;
      b: S.Schema<number, number, never>;
  }
  */
  const personFields = Person.fields;

  const PersonWithGender = S.struct({
    gender: S.string,
    ...Person.fields,
  });

  /*
  const personWithGenderFields: {
      name: S.Schema<string, string, never>;
      age: S.Schema<number, number, never>;
      gender: S.Schema<string, string, never>;
  }
  */
  const personWithGenderFields = PersonWithGender.fields;
  ```

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
