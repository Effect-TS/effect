---
"effect": minor
---

add `Effect.bindAll` api

This api allows you to combine `Effect.all` with `Effect.bind`. It is useful
when you want to concurrently run multiple effects and then combine their
results in a Do notation pipeline.

```ts
import { Effect } from "effect";

const result = Effect.Do.pipe(
  Effect.bind("x", () => Effect.succeed(2)),
  Effect.bindAll(
    ({ x }) => ({
      a: Effect.succeed(x + 1),
      b: Effect.succeed("foo"),
    }),
    { concurrency: 2 },
  ),
);
assert.deepStrictEqual(Effect.runSync(result), {
  x: 2,
  a: 3,
  b: "foo",
});
```
