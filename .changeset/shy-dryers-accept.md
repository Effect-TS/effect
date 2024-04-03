---
"effect": patch
---

add Effect.filterMap api

Which allows you to filter and map an Iterable of Effects in one step.

```ts
import { Effect, Option } from "effect";

// resolves with `["even: 2"]
Effect.filterMap(
  [Effect.succeed(1), Effect.succeed(2), Effect.succeed(3)],
  (i) => (i % 2 === 0 ? Option.some(`even: ${i}`) : Option.none())
);
```
