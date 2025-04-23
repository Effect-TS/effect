import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Channel, Context, Effect, Either, Exit, Option, pipe, Random } from "effect"
import { unify } from "effect/Unify"

describe("Channel.Foreign", () => {
  it.effect("Tag", () =>
    Effect.gen(function*() {
      const tag = Context.GenericTag<number>("number")
      const result = yield* pipe(tag, Channel.run, Effect.provideService(tag, 10))
      strictEqual(result, 10)
    }))

  it.effect("Unify", () =>
    Effect.gen(function*() {
      const unifiedEffect = unify((yield* (Random.nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* (Random.nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* (Random.nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* (Random.nextInt)) > 1 ? Option.some(0) : Option.none())
      strictEqual(yield* (Channel.run(unifiedEffect)), 0)
      strictEqual(yield* (Channel.run(unifiedExit)), 0)
      strictEqual(yield* (Channel.run(unifiedEither)), 0)
      strictEqual(yield* (Channel.run(unifiedOption)), 0)
    }))
})
