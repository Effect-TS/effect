---
"@effect/schema": patch
---

add `annotations?` parameter to Class constructors

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
