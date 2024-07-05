---
"effect": minor
---

feat(Stream): implement "raceAll" operator, which returns a stream that mirrors the first source stream to emit an item.

```ts
import { Stream, Schedule, Console, Effect } from "effect";

const stream = Stream.raceAll(
  Stream.fromSchedule(Schedule.spaced("1 millis")),
  Stream.fromSchedule(Schedule.spaced("2 millis")),
  Stream.fromSchedule(Schedule.spaced("4 millis")),
).pipe(Stream.take(6), Stream.tap(Console.log));

Effect.runPromise(Stream.runDrain(stream));
// Output only from the first stream, the rest streams are interrupted
// 0
// 1
// 2
// 3
// 4
// 5
```
