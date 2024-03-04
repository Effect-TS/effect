---
"effect": patch
---

add FiberMap/FiberSet.join api

This api can be used to propogate failures back to a parent fiber, in case any of the fibers added to the FiberMap/FiberSet fail with an error.

Example:

```ts
import { Effect, FiberSet } from "effect";

Effect.gen(function* (_) {
  const set = yield* _(FiberSet.make());
  yield* _(FiberSet.add(set, Effect.runFork(Effect.fail("error"))));

  // parent fiber will fail with "error"
  yield* _(FiberSet.join(set));
});
```
