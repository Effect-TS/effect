---
"effect": patch
---

Support Heterogeneous Effects in Effect.allSuccesses

```ts
import { Effect } from "effect";

class Foo extends Effect.Tag("Foo")<Foo, 3>() {}
class Bar extends Effect.Tag("Bar")<Bar, 4>() {}

// const program: Effect.Effect<(1 | 2 | 3 | 4)[], never, Foo | Bar>
export const program = Effect.allSuccesses([
  Effect.succeed(1 as const),
  Effect.succeed(2 as const),
  Foo,
  Bar,
]);
```

The above is now possible while before it was expecting all Effects to conform to the same type
