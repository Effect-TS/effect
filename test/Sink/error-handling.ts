import { Effect, Exit, Sink, Stream } from "effect"
import * as it from "effect-test/utils/extend"
import { pipe } from "effect/Function"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("propagates errors", () =>
    Effect.gen(function*($) {
      const ErrorStream = "ErrorStream" as const
      const ErrorMapped = "ErrorMapped" as const
      const ErrorSink = "ErrorSink" as const
      const result = yield* $(
        Stream.fail(ErrorStream),
        Stream.mapError(() => ErrorMapped),
        Stream.run(
          pipe(
            Sink.drain,
            Sink.mapInputEffect((input: number) => Effect.try(() => input)),
            Sink.mapError(() => ErrorSink)
          )
        ),
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.fail(ErrorMapped))
    }))
})
