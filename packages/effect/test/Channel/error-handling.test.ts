import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Channel from "effect/Channel"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

describe("Channel", () => {
  it.effect("catchAll - structure confusion", () =>
    Effect.gen(function*() {
      const channel = pipe(
        Channel.write(8),
        Channel.catchAll(() =>
          pipe(
            Channel.write(0),
            Channel.concatMap(() => Channel.fail("error1"))
          )
        ),
        Channel.concatMap(() => Channel.fail("error2"))
      )
      const result = yield* (Effect.exit(Channel.runCollect(channel)))
      deepStrictEqual(result, Exit.fail("error2"))
    }))

  it.effect("error cause is propagated on channel interruption", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const finished = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make<Exit.Exit<void>>(Exit.void))
      const effect = pipe(
        Deferred.succeed(deferred, void 0),
        Effect.zipRight(Effect.never)
      )
      yield* pipe(
        Channel.fromEffect(effect),
        Channel.runDrain,
        Effect.onExit((exit) => Ref.set(ref, exit as Exit.Exit<void>)),
        Effect.ensuring(Deferred.succeed(finished, void 0)),
        Effect.race(Deferred.await(deferred)),
        Effect.either
      )
      yield* (Deferred.await(finished)) // Note: interruption in race is now done in the background
      const result = yield* (Ref.get(ref))
      assertTrue(Exit.isInterrupted(result))
    }))

  it.effect("scoped failures", () =>
    Effect.gen(function*() {
      const channel = Channel.scoped(Effect.fail("error"))
      const result = yield* pipe(Channel.runCollect(channel), Effect.exit)
      deepStrictEqual(result, Exit.fail("error"))
    }))
})
