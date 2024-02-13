---
"@effect/schema": patch
---

Use the `identity` function in the transformation defining a schema class

This allows for the encoding of structs that have getters.

For example, this will no longer throw an error:

```ts
import * as S from "@effect/schema/Schema";

class C extends S.Class<C>()({
  n: S.NumberFromString,
}) {
  get b() {
    return 1;
  }
}
class D extends S.Class<D>()({
  n: S.NumberFromString,
  b: S.number,
}) {}

console.log(S.encodeSync(D)(new C({ n: 1 })));
// Output: { b: 1, n: '1' }
```
