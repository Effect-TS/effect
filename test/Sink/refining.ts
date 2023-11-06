import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import { Effect } from "effect/Effect"
import { Exit } from "effect/Exit"
import { pipe } from "effect/Function"
import { Option } from "effect/Option"
import * as Sink from "effect/Sink"
import { Stream } from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("refineOrDie", () =>
    Effect.gen(function*($) {
      const exception = Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDie((error) =>
          Cause.isRuntimeException(error) ?
            Option.some(refinedTo) :
            Option.none()
        )
      )
      const result = yield* $(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail(refinedTo))
    }))

  it.effect("refineOrDieWith - refines", () =>
    Effect.gen(function*($) {
      const exception = Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDieWith((error) =>
          Cause.isRuntimeException(error) ?
            Option.some(refinedTo) :
            Option.none(), (error) => error.message)
      )
      const result = yield* $(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail(refinedTo))
    }))

  it.effect("refineOrDieWith - dies", () =>
    Effect.gen(function*($) {
      const exception = Cause.RuntimeException()
      const refinedTo = "refined"
      const sink = pipe(
        Sink.fail(exception),
        Sink.refineOrDieWith((error) =>
          Cause.isIllegalArgumentException(error) ?
            Option.some(refinedTo) :
            Option.none(), (error) => error.message)
      )
      const result = yield* $(Stream.make(1, 2, 3), Stream.run(sink), Effect.exit)
      assert.deepStrictEqual(result, Exit.die(void 0))
    }))
})
