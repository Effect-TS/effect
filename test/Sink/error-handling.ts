import * as it from "effect-test/utils/extend"
import { Effect } from "effect/Effect"
import { Exit } from "effect/Exit"
import { pipe } from "effect/Function"
import { Sink } from "effect/Sink"
import { Stream } from "effect/Stream"
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
