---
"effect": minor
---

`Schedule.LastIterationInfo` has been added

```ts
import { Effect, Schedule } from "effect"

Effect.gen(function* () {
  const currentIterationMetadata = yield* Schedule.CurrentIterationMetadata
  //     ^? Schedule.IterationMetadata

  console.log(currentIterationMetadata)
}).pipe(Effect.repeat(Schedule.recurs(2)))
// {
//   elapsed: Duration.zero,
//   elapsedSincePrevious: Duration.zero,
//   input: undefined,
//   now: 0,
//   recurrence: 0,
//   start: 0
// }
// {
//   elapsed: Duration.zero,
//   elapsedSincePrevious: Duration.zero,
//   input: undefined,
//   now: 0,
//   recurrence: 1,
//   start: 0
// }
// {
//   elapsed: Duration.zero,
//   elapsedSincePrevious: Duration.zero,
//   input: undefined,
//   now: 0,
//   recurrence: 2,
//   start: 0
// }

Effect.gen(function* () {
  const currentIterationMetadata = yield* Schedule.CurrentIterationMetadata

  console.log(currentIterationMetadata)
}).pipe(
  Effect.schedule(
    Schedule.intersect(Schedule.fibonacci("1 second"), Schedule.recurs(3))
  )
)
// {
//   elapsed: Duration.zero,
//   elapsedSincePrevious: Duration.zero,
//   recurrence: 1,
//   input: undefined,
//   now: 0,
//   start: 0
// },
// {
//   elapsed: Duration.seconds(1),
//   elapsedSincePrevious: Duration.seconds(1),
//   recurrence: 2,
//   input: undefined,
//   now: 1000,
//   start: 0
// },
// {
//   elapsed: Duration.seconds(2),
//   elapsedSincePrevious: Duration.seconds(1),
//   recurrence: 3,
//   input: undefined,
//   now: 2000,
//   start: 0
// }
```
