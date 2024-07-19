---
"effect": minor
---


feat(Stream): implement `race` operator, which accepts two upstreams and returns a stream that mirrors the first upstream to emit an item and interrupts the other upstream.

```ts
import { Stream, Schedule, Console, Effect } from "effect"

const stream = Stream.fromSchedule(Schedule.spaced('2 millis')).pipe(
  Stream.race(Stream.fromSchedule(Schedule.spaced('1 millis'))),
  Stream.take(6),
  Stream.tap(n => Console.log(n))
)

Effect.runPromise(Stream.runDrain(stream))
// Output each millisecond from the first stream, the rest streams are interrupted
// 0
// 1
// 2
// 3
// 4
// 5
```