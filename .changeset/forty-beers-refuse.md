---
"effect": minor
---

add Stream.asyncPush api

This api creates a stream from an external push-based resource.

You can use the `emit` helper to emit values to the stream. You can also use
the `emit` helper to signal the end of the stream by using apis such as
`emit.end` or `emit.fail`.

By default it uses a buffer size of 16 and a dropping strategy to prevent
memory issues. You can customize the buffer size and strategy by passing an
object as the second argument with the `bufferSize` and `strategy` fields.

```ts
import { Effect, Stream } from "effect";

Stream.asyncPush<string>(
  (emit) =>
    Effect.acquireRelease(
      Effect.gen(function* () {
        yield* Effect.log("subscribing");
        return setInterval(() => emit.single("tick"), 1000);
      }),
      (handle) =>
        Effect.gen(function* () {
          yield* Effect.log("unsubscribing");
          clearInterval(handle);
        }),
    ),
  { bufferSize: 16, strategy: "dropping" },
);
```
