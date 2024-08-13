---
"effect": minor
---

add Scheduler.reversedScheduler

`Scheduler.reversedScheduler` runs tasks with a higher priority number first.

To provide it to your program:

```ts
import { Console, Effect, Layer, Scheduler } from "effect";

const testEffect = (priority: number) =>
  Effect.yieldNow({ priority }).pipe(Effect.andThen(Console.log(priority)));

// Output:
//
// 5
// 4
// 3
// 2
// 1
// 0
Effect.all(
  [
    testEffect(1),
    testEffect(2),
    testEffect(0),
    testEffect(4),
    testEffect(3),
    testEffect(5),
  ],
  { concurrency: "unbounded" },
).pipe(
  Effect.provide(Layer.setScheduler(Scheduler.reversedScheduler)),
  Effect.runPromise,
);
```
