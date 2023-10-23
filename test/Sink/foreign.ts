import * as it from "effect-test/utils/extend"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import type * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { unify } from "effect/Unify"
import { assert, describe } from "vitest"

const runSink = <R, E, A>(sink: Sink.Sink<R, E, unknown, unknown, A>) => Stream.run(Effect.unit, sink)

describe.concurrent("Channel.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*($) {
      const tag = Context.Tag<number>()
      const result = yield* $(tag, runSink, Effect.provideService(tag, 10))
      assert.deepEqual(result, 10)
    }))

  it.effect("Unify", () =>
    Effect.gen(function*($) {
      const unifiedEffect = unify((yield* $(Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* $(Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* $(Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* $(Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      assert.deepEqual(yield* $(runSink(unifiedEffect)), 0)
      assert.deepEqual(yield* $(runSink(unifiedExit)), 0)
      assert.deepEqual(yield* $(runSink(unifiedEither)), 0)
      assert.deepEqual(yield* $(runSink(unifiedOption)), 0)
    }))
})
