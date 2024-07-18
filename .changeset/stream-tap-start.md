---
"effect": minor
---

Implement `Stream.tapStart` that adds an effect to be executed at the start of the stream.

```ts
import { Console, Effect, Stream } from "effect";

const stream = Stream.make(1, 2, 3).pipe(
  Stream.tapStart(Console.log("Stream started")),
  Stream.map((n) => n * 2),
  Stream.tap((n) => Console.log(`after mapping: ${n}`))
) 

Effect. runPromise(Stream. runCollect(stream)).then(console. log) 
// Stream started 
// after mapping: 2 
// after mapping: 4 
// after mapping: 6 
// { _id: 'Chunk', values: [ 2, 4, 6 ] }
```
