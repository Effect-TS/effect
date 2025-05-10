import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("propagates errors", () =>
    Effect.gen(function*() {
      const ErrorStream = "ErrorStream" as const
      const ErrorMapped = "ErrorMapped" as const
      const ErrorSink = "ErrorSink" as const
      const result = yield* pipe(
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
      deepStrictEqual(result, Exit.fail(ErrorMapped))
    }))
})
