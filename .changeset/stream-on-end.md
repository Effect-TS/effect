---
"effect": minor
---

Implement `Stream.onEnd` that adds an effect to be executed at the end of the stream.

```ts
import { Console, Effect, Stream } from "effect";

const stream = Stream.make(1, 2, 3).pipe(
  Stream.map((n) => n * 2),
  Stream.tap((n) => Console.log(`after mapping: ${n}`)),
  Stream.onEnd(Console.log("Stream ended"))
)

Effect.runPromise(Stream.runCollect(stream)).then(console.log)
// after mapping: 2
// after mapping: 4
// after mapping: 6
// Stream ended
// { _id: 'Chunk', values: [ 2, 4, 6 ] }
```