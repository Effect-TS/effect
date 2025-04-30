import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"

describe("Effect", () => {
  it.effect("fork - propagates interruption", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.never, Effect.fork, Effect.flatMap(Fiber.interrupt))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("fork - propagates interruption with zip of defect", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.die(new Error())),
        Effect.zip(Effect.never, { concurrent: true }),
        Effect.fork
      )

      yield* (Deferred.await(latch))
      const result = yield* pipe(Fiber.interrupt(fiber), Effect.map(Exit.mapErrorCause((cause) => cause)))
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("fork - interruption status is heritable", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(true))
      yield* pipe(
        Effect.checkInterruptible((isInterruptible) =>
          pipe(Ref.set(ref, isInterruptible), Effect.zipRight(Deferred.succeed(latch, void 0)))
        ),
        Effect.fork,
        Effect.zipRight(Deferred.await(latch)),
        Effect.uninterruptible
      )

      const result = yield* (Ref.get(ref))
      assertFalse(result)
    }))
  it.effect("forkWithErrorHandler - calls provided function when task fails", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      yield* pipe(
        Effect.fail<void>(void 0),
        Effect.forkWithErrorHandler((e) => pipe(Deferred.succeed(deferred, e), Effect.asVoid))
      )
      const result = yield* (Deferred.await(deferred))
      strictEqual(result, undefined)
    }))
  it.effect("forkAll - returns the list of results in the same order", () =>
    Effect.gen(function*() {
      const result = yield* pipe([1, 2, 3].map(Effect.succeed), Effect.forkAll(), Effect.flatMap(Fiber.join))
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forkAll - happy-path", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Array.from({ length: 1000 }, (_, i) => i + 1).map(Effect.succeed),
        Effect.forkAll(),
        Effect.flatMap(Fiber.join)
      )
      deepStrictEqual(
        Array.from(result),
        Array.from({ length: 1000 }, (_, i) => i + 1)
      )
    }))
  it.effect("forkAll - empty input", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe([] as ReadonlyArray<Effect.Effect<number>>, Effect.forkAll(), Effect.flatMap(Fiber.join))
      )
      strictEqual(result.length, 0)
    }))
  it.effect("forkAll - propagate failures", () =>
    Effect.gen(function*() {
      const boom = new Error()
      const fail = Effect.fail(boom)
      const result = yield* pipe([fail], Effect.forkAll(), Effect.flatMap((fiber) => Effect.flip(Fiber.join(fiber))))
      strictEqual(result, boom)
    }))
  it.effect("forkAll - propagates defects", () =>
    Effect.gen(function*() {
      const boom = new Error("boom")
      const die = Effect.die(boom)
      const joinDefect = (fiber: Fiber.Fiber<unknown>) => {
        return pipe(fiber, Fiber.join, Effect.sandbox, Effect.flip)
      }
      const fiber1 = yield* (Effect.forkAll([die]))
      const fiber2 = yield* (Effect.forkAll([die, Effect.succeed(42)]))
      const fiber3 = yield* (Effect.forkAll([die, Effect.succeed(42), Effect.never]))
      const result1 = yield* pipe(joinDefect(fiber1), Effect.map((cause) => cause))
      const result2 = yield* pipe(joinDefect(fiber2), Effect.map((cause) => cause))
      const result3 = yield* pipe(joinDefect(fiber3), Effect.map((cause) => cause))
      deepStrictEqual(Cause.dieOption(result1), Option.some(boom))
      deepStrictEqual(Cause.dieOption(result2), Option.some(boom))
      deepStrictEqual(Cause.dieOption(result3), Option.some(boom))
      assertTrue(Cause.isInterrupted(result3))
    }))
  it.effect("forkAll - infers correctly", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const worker = Effect.never
      const workers = Array.from({ length: 4 }, () => worker)
      const fiber = yield* (Effect.forkAll(workers))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      strictEqual(result, 0)
    }))
  it.effect("forkAll - infers correctly with error type", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(0))
      const worker = Effect.forever(Effect.fail(new Cause.RuntimeException("fail")))
      const workers = Array.from({ length: 4 }, () => worker)
      const fiber = yield* (Effect.forkAll(workers))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      strictEqual(result, 0)
    }))
})
