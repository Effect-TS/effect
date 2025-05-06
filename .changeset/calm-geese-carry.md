---
"effect": minor
---

`Schedule.LastIterationInfo` has been added

```ts
import { Effect, Schedule } from "effect"

Effect.gen(function* () {
  const iterationInfo = yield* Schedule.LastIterationInfo
  //    ^? Option<Schedule.IterationInfo>

  console.log(iterationInfo)
}).pipe(
  Effect.repeat(Schedule.recurs(2)) // <-- Effect.repeat
)
// Option.none()
// Option.some({ duration: Duration.zero, iteration: 1 })
// Option.some({ duration: Duration.zero, iteration: 2 })

Effect.gen(function* () {
  const iterationInfo = yield* Schedule.LastIterationInfo

  console.log(iterationInfo)
}).pipe(
  // Effect.schedule( // <-- Effect.schedule
    Schedule.intersect(
      Schedule.fibonacci("1 second"),
      Schedule.recurs(3)
    )
  )
)
// Option.some({ duration: Duration.seconds(1), iteration: 1 })
// Option.some({ duration: Duration.seconds(1), iteration: 2 })
// Option.some({ duration: Duration.seconds(2), iteration: 3 })
```
