import * as it from "effect-test/utils/extend"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

describe.concurrent("Deferred", () => {
  it.effect("complete a deferred using succeed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const success = yield* $(Deferred.succeed(deferred, 32))
      const result = yield* $(Deferred.await(deferred))
      assert.isTrue(success)
      assert.strictEqual(result, 32)
    }))
  it.effect("complete a deferred using complete", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const ref = yield* $(Ref.make(13))
      yield* $(Deferred.complete(deferred, Ref.updateAndGet(ref, (n) => n + 1)))
      const result1 = yield* $(Deferred.await(deferred))
      const result2 = yield* $(Deferred.await(deferred))
      assert.strictEqual(result1, 14)
      assert.strictEqual(result2, 14)
    }))
  it.effect("complete a deferred using completeWith", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, number>())
      const ref = yield* $(Ref.make(13))
      yield* $(Deferred.completeWith(deferred, Ref.updateAndGet(ref, (n) => n + 1)))
      const result1 = yield* $(Deferred.await(deferred))
      const result2 = yield* $(Deferred.await(deferred))
      assert.strictEqual(result1, 14)
      assert.strictEqual(result2, 15)
    }))
  it.effect("complete a deferred twice", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 1))
      const success = yield* $(Deferred.complete(deferred, Effect.succeed(9)))
      const result = yield* $(Deferred.await(deferred))
      assert.isFalse(success)
      assert.strictEqual(result, 1)
    }))
  it.effect("fail a deferred using fail", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const success = yield* $(Deferred.fail(deferred, "error with fail"))
      const result = yield* $(deferred, Deferred.await, Effect.exit)
      assert.isTrue(success)
      assert.isTrue(Exit.isFailure(result))
    }))
  it.effect("fail a deferred using complete", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const ref = yield* $(Ref.make(["first error", "second error"]))
      const success = yield* $(
        Deferred.complete(deferred, Effect.flip(Ref.modify(ref, (as) => [as[0]!, as.slice(1)])))
      )
      const result1 = yield* $(deferred, Deferred.await, Effect.exit)
      const result2 = yield* $(deferred, Deferred.await, Effect.exit)
      assert.isTrue(success)
      assert.isTrue(Exit.isFailure(result1))
      assert.isTrue(Exit.isFailure(result2))
    }))
  it.effect("fail a deferred using completeWith", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const ref = yield* $(Ref.make(["first error", "second error"]))
      const success = yield* $(
        Deferred.completeWith(
          deferred,
          Effect.flip(
            Ref.modify(ref, (as) => [as[0]!, as.slice(1)])
          )
        )
      )
      const result1 = yield* $(deferred, Deferred.await, Effect.exit)
      const result2 = yield* $(deferred, Deferred.await, Effect.exit)
      assert.isTrue(success)
      assert.isTrue(Exit.isFailure(result1))
      assert.isTrue(Exit.isFailure(result2))
    }))
  it.effect("is done when a deferred is completed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 0))
      const result = yield* $(Deferred.isDone(deferred))
      assert.isTrue(result)
    }))
  it.effect("is done when a deferred is failed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.fail(deferred, "failure"))
      const result = yield* $(Deferred.isDone(deferred))
      assert.isTrue(result)
    }))
  it.effect("should interrupt a deferred", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const result = yield* $(Deferred.interrupt(deferred))
      assert.isTrue(result)
    }))
  it.effect("poll a deferred that is not completed yet", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      const result = yield* $(Deferred.poll(deferred))
      assert.isTrue(Option.isNone(result))
    }))
  it.effect("poll a deferred that is completed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.succeed(deferred, 12))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      assert.deepStrictEqual(result, Exit.succeed(12))
    }))
  it.effect("poll a deferred that is failed", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.fail(deferred, "failure"))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      assert.isTrue(Exit.isFailure(result))
    }))
  it.effect("poll a deferred that is interrupted", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<string, number>())
      yield* $(Deferred.interrupt(deferred))
      const result = yield* $(
        Deferred.poll(deferred).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail("fail"),
            onSome: Effect.succeed
          })),
          Effect.flatten,
          Effect.exit
        )
      )
      assert.isTrue(Exit.isInterrupted(result))
    }))
})
