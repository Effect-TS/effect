import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Deferred, Effect, Exit, Option, pipe, Ref } from "effect"

describe("Deferred", () => {
  it.effect("complete a deferred using succeed", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number>()
      const success = yield* Deferred.succeed(deferred, 32)
      const result = yield* Deferred.await(deferred)
      assertTrue(success)
      strictEqual(result, 32)
    }))
  it.effect("complete a deferred using complete", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number>()
      const ref = yield* Ref.make(13)
      yield* Deferred.complete(deferred, Ref.updateAndGet(ref, (n) => n + 1))
      const result1 = yield* Deferred.await(deferred)
      const result2 = yield* Deferred.await(deferred)
      strictEqual(result1, 14)
      strictEqual(result2, 14)
    }))
  it.effect("complete a deferred using completeWith", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number>()
      const ref = yield* Ref.make(13)
      yield* Deferred.completeWith(deferred, Ref.updateAndGet(ref, (n) => n + 1))
      const result1 = yield* Deferred.await(deferred)
      const result2 = yield* Deferred.await(deferred)
      strictEqual(result1, 14)
      strictEqual(result2, 15)
    }))
  it.effect("complete a deferred twice", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.succeed(deferred, 1)
      const success = yield* Deferred.complete(deferred, Effect.succeed(9))
      const result = yield* Deferred.await(deferred)
      assertFalse(success)
      strictEqual(result, 1)
    }))
  it.effect("fail a deferred using fail", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      const success = yield* Deferred.fail(deferred, "error with fail")
      const result = yield* pipe(deferred, Deferred.await, Effect.exit)
      assertTrue(success)
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("fail a deferred using complete", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      const ref = yield* Ref.make(["first error", "second error"])
      const success = yield* Deferred.complete(deferred, Effect.flip(Ref.modify(ref, (as) => [as[0]!, as.slice(1)])))
      const result1 = yield* pipe(deferred, Deferred.await, Effect.exit)
      const result2 = yield* pipe(deferred, Deferred.await, Effect.exit)
      assertTrue(success)
      assertTrue(Exit.isFailure(result1))
      assertTrue(Exit.isFailure(result2))
    }))
  it.effect("fail a deferred using completeWith", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      const ref = yield* Ref.make(["first error", "second error"])
      const success = yield* Deferred.completeWith(
        deferred,
        Effect.flip(
          Ref.modify(ref, (as) => [as[0]!, as.slice(1)])
        )
      )
      const result1 = yield* pipe(deferred, Deferred.await, Effect.exit)
      const result2 = yield* pipe(deferred, Deferred.await, Effect.exit)
      assertTrue(success)
      assertTrue(Exit.isFailure(result1))
      assertTrue(Exit.isFailure(result2))
    }))
  it.effect("is done when a deferred is completed", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.succeed(deferred, 0)
      const result = yield* Deferred.isDone(deferred)
      assertTrue(result)
    }))
  it.effect("is done when a deferred is failed", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.fail(deferred, "failure")
      const result = yield* Deferred.isDone(deferred)
      assertTrue(result)
    }))
  it.effect("should interrupt a deferred", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      const result = yield* Deferred.interrupt(deferred)
      assertTrue(result)
    }))
  it.effect("poll a deferred that is not completed yet", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      const result = yield* Deferred.poll(deferred)
      assertTrue(Option.isNone(result))
    }))
  it.effect("poll a deferred that is completed", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.succeed(deferred, 12)
      const result = yield* Deferred.poll(deferred).pipe(
        Effect.flatMap(Option.match({
          onNone: () => Effect.fail("fail"),
          onSome: Effect.succeed
        })),
        Effect.flatten,
        Effect.exit
      )
      deepStrictEqual(result, Exit.succeed(12))
    }))
  it.effect("poll a deferred that is failed", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.fail(deferred, "failure")
      const result = yield* Deferred.poll(deferred).pipe(
        Effect.flatMap(Option.match({
          onNone: () => Effect.fail("fail"),
          onSome: Effect.succeed
        })),
        Effect.flatten,
        Effect.exit
      )
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("poll a deferred that is interrupted", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number, string>()
      yield* Deferred.interrupt(deferred)
      const result = yield* Deferred.poll(deferred).pipe(
        Effect.flatMap(Option.match({
          onNone: () => Effect.fail("fail"),
          onSome: Effect.succeed
        })),
        Effect.flatten,
        Effect.exit
      )
      assertTrue(Exit.isInterrupted(result))
    }))
  it.effect("is subtype of Effect", () =>
    Effect.gen(function*() {
      const deferred = yield* Deferred.make<number>()
      const ref = yield* Ref.make(13)
      yield* Deferred.complete(deferred, Ref.updateAndGet(ref, (n) => n + 1))
      const result1 = yield* deferred
      const result2 = yield* deferred
      strictEqual(result1, 14)
      strictEqual(result2, 14)
    }))
})
