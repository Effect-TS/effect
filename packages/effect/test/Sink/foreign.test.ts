import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import type * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { deepStrictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { unify } from "effect/Unify"
import { describe } from "vitest"

const runSink = <A, E, R>(sink: Sink.Sink<A, unknown, unknown, E, R>) => Stream.run(Effect.void, sink)

describe("Channel.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*($) {
      const tag = Context.GenericTag<number>("number")
      const result = yield* $(tag, runSink, Effect.provideService(tag, 10))
      deepStrictEqual(result, 10)
    }))

  it.effect("Unify", () =>
    Effect.gen(function*($) {
      const unifiedEffect = unify((yield* $(Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* $(Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* $(Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* $(Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      deepStrictEqual(yield* $(runSink(unifiedEffect)), 0)
      deepStrictEqual(yield* $(runSink(unifiedExit)), 0)
      deepStrictEqual(yield* $(runSink(unifiedEither)), 0)
      deepStrictEqual(yield* $(runSink(unifiedOption)), 0)
    }))
})
