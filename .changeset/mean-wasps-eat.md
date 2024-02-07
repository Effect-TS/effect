---
"effect": patch
---

add Option.orElseSome

Allows you to specify a default value for an Option, similar to
Option.getOrElse, except the return value is still an Option.

```ts
import * as O from "effect/Option";
import { pipe } from "effect/Function";

assert.deepStrictEqual(
  pipe(
    O.none(),
    O.orElseSome(() => "b"),
  ),
  O.some("b"),
);
assert.deepStrictEqual(
  pipe(
    O.some("a"),
    O.orElseSome(() => "b"),
  ),
  O.some("a"),
);
```
