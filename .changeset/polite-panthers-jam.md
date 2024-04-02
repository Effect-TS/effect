---
"effect": patch
---

add Iterable module

This module shares many apis compared to "effect/ReadonlyArray", but is fully lazy.

```ts
import { Iterable, pipe } from "effect";

// Only 5 items will be generated & transformed
pipe(
  Iterable.range(1, 100),
  Iterable.map((i) => `item ${i}`),
  Iterable.take(5)
);
```
