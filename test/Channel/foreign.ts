import * as it from "effect-test/utils/extend"
import { Channel } from "effect/Channel"
import { Context } from "effect/Context"
import { Effect } from "effect/Effect"
import { Either } from "effect/Either"
import { Exit } from "effect/Exit"
import { Option } from "effect/Option"
import { Random } from "effect/Random"
import { unify } from "effect/Unify"
import { assert, describe } from "vitest"

describe.concurrent("Channel.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*($) {
      const tag = Context.Tag<number>()
      const result = yield* $(tag, Channel.run, Effect.provideService(tag, 10))
      assert.deepEqual(result, 10)
    }))

  it.effect("Unify", () =>
    Effect.gen(function*($) {
      const unifiedEffect = unify((yield* $(Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* $(Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* $(Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* $(Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      assert.deepEqual(yield* $(Channel.run(unifiedEffect)), 0)
      assert.deepEqual(yield* $(Channel.run(unifiedExit)), 0)
      assert.deepEqual(yield* $(Channel.run(unifiedEither)), 0)
      assert.deepEqual(yield* $(Channel.run(unifiedOption)), 0)
    }))
})
