import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"

describe("Sink", () => {
  it.effect("refineOrDie", () =>
    Effect.gen(function*() {
      const exception = new Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDie((error) =>
          Cause.isRuntimeException(error) ?
            Option.some(refinedTo) :
            Option.none()
        )
      )
      const result = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      deepStrictEqual(result, Exit.fail(refinedTo))
    }))

  it.effect("refineOrDieWith - refines", () =>
    Effect.gen(function*() {
      const exception = new Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDieWith((error) =>
          Cause.isRuntimeException(error) ?
            Option.some(refinedTo) :
            Option.none(), (error) => error.message)
      )
      const result = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      deepStrictEqual(result, Exit.fail(refinedTo))
    }))

  it.effect("refineOrDieWith - dies", () =>
    Effect.gen(function*() {
      const exception = new Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDieWith((error) =>
          Cause.isIllegalArgumentException(error) ?
            Option.some(refinedTo) :
            Option.none(), (error) => error.message)
      )
      const result = yield* pipe(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      deepStrictEqual(result, Exit.die(""))
    }))
})
