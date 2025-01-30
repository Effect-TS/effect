import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Random from "effect/Random"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { unify } from "effect/Unify"
import { describe } from "vitest"

describe("Channel.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*($) {
      const tag = Context.GenericTag<number>("number")
      const result = yield* $(tag, Channel.run, Effect.provideService(tag, 10))
      strictEqual(result, 10)
    }))

  it.effect("Unify", () =>
    Effect.gen(function*($) {
      const unifiedEffect = unify((yield* $(Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* $(Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* $(Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* $(Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      strictEqual(yield* $(Channel.run(unifiedEffect)), 0)
      strictEqual(yield* $(Channel.run(unifiedExit)), 0)
      strictEqual(yield* $(Channel.run(unifiedEither)), 0)
      strictEqual(yield* $(Channel.run(unifiedOption)), 0)
    }))
})
