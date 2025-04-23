import { describe, it } from "@effect/vitest"
import { assertLeft, assertTrue, strictEqual } from "@effect/vitest/utils"
import * as Channel from "effect/Channel"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

describe("Channel", () => {
  it.effect("interruptWhen - interrupts the current element", () =>
    Effect.gen(function*() {
      const interrupted = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      const started = yield* (Deferred.make<void>())
      const channel = pipe(
        Deferred.succeed(started, void 0),
        Effect.zipRight(Deferred.await(latch)),
        Effect.onInterrupt(() => Ref.set(interrupted, true)),
        Channel.fromEffect,
        Channel.interruptWhen(Deferred.await(halt))
      )
      const fiber = yield* (Effect.fork(Channel.runDrain(channel)))
      yield* pipe(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed(halt, void 0))
      )
      yield* (Fiber.await(fiber))
      const result = yield* (Ref.get(interrupted))
      assertTrue(result)
    }))

  it.effect("interruptWhen - propagates errors", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<never, string>())
      const channel = pipe(
        Channel.fromEffect(Effect.never),
        Channel.interruptWhen(Deferred.await(deferred))
      )
      yield* (Deferred.fail(deferred, "fail"))
      const result = yield* (Effect.either(Channel.runDrain(channel)))
      assertLeft(result, "fail")
    }))

  it.effect("interruptWhenDeferred - interrupts the current element", () =>
    Effect.gen(function*() {
      const interrupted = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      const started = yield* (Deferred.make<void>())
      const channel = pipe(
        Deferred.succeed(started, void 0),
        Effect.zipRight(Deferred.await(latch)),
        Effect.onInterrupt(() => Ref.set(interrupted, true)),
        Channel.fromEffect,
        Channel.interruptWhenDeferred(halt)
      )
      const fiber = yield* (Effect.fork(Channel.runDrain(channel)))
      yield* pipe(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed(halt, void 0))
      )
      yield* (Fiber.await(fiber))
      const result = yield* (Ref.get(interrupted))
      assertTrue(result)
    }))

  it.effect("interruptWhenDeferred - propagates errors", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<never, string>())
      const channel = pipe(
        Channel.fromEffect(Effect.never),
        Channel.interruptWhenDeferred(deferred)
      )
      yield* (Deferred.fail(deferred, "fail"))
      const result = yield* (Effect.either(Channel.runDrain(channel)))
      assertLeft(result, "fail")
    }))

  it.effect("runScoped - in uninterruptible region", () =>
    Effect.gen(function*() {
      const result = yield* Effect.uninterruptible(Channel.run(Channel.void))
      strictEqual(result, undefined)
    }))
})
