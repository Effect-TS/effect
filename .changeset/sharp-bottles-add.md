---
"effect": patch
---

add Logger.batched, for batching logger output

It takes a duration window and an effectful function that processes the batched output.

Example:

```ts
import { Console, Effect, Logger } from "effect";

const LoggerLive = Logger.replaceScoped(
  Logger.defaultLogger,
  Logger.logfmtLogger.pipe(
    Logger.batched("500 millis", (messages) =>
      Console.log("BATCH", messages.join("\n"))
    )
  )
);

Effect.gen(function* (_) {
  yield* _(Effect.log("one"));
  yield* _(Effect.log("two"));
  yield* _(Effect.log("three"));
}).pipe(Effect.provide(LoggerLive), Effect.runFork);
```
