---
"@effect/platform": minor
"effect": minor
"@effect/schema": minor
"@effect/cli": minor
"@effect/rpc": minor
---

With this change we remove the `Data.Data` type and we make `Equal.Equal` & `Hash.Hash` implicit traits.

The main reason is that `Data.Data<A>` was structurally equivalent to `A & Equal.Equal` but extending `Equal.Equal` doesn't mean that the equality is implemented by-value, so the type was simply adding noise without gaining any level of safety.

The module `Data` remains unchanged at the value level, all the functions previously available are supposed to work in exactly the same manner.

At the type level instead the functions return `Readonly` variants, so for example we have:

```ts
import { Data } from "effect";

const obj = Data.struct({
  a: 0,
  b: 1,
});
```

will have the `obj` typed as:

```ts
declare const obj: {
  readonly a: number;
  readonly b: number;
};
```
