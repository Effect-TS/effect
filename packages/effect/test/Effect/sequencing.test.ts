import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constFalse, constTrue, pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("flattens nested effects", () =>
    Effect.gen(function*($) {
      const effect = Effect.succeed(Effect.succeed("test"))
      const flatten1 = yield* $(Effect.flatten(effect))
      const flatten2 = yield* $(Effect.flatten(effect))
      assert.strictEqual(flatten1, "test")
      assert.strictEqual(flatten2, "test")
    }))
  it.effect("if - runs `onTrue` if result of `b` is `true`", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        true,
        Effect.if({
          onTrue: Effect.succeed(true),
          onFalse: Effect.succeed(false)
        })
      )
      assert.isTrue(result)
    }))
  it.effect("if - runs `onFalse` if result of `b` is `false`", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.succeed(false),
        Effect.if({
          onFalse: Effect.succeed(true),
          onTrue: Effect.succeed(false)
        })
      )
      assert.isTrue(result)
    }))
  describe.concurrent("", () => {
    it.effect("tapErrorCause - effectually peeks at the cause of the failure of this effect", () =>
      Effect.gen(function*($) {
        const ref = yield* $(Ref.make(false))
        const result = yield* $(
          pipe(Effect.dieMessage("die"), Effect.tapErrorCause(() => Ref.set(ref, true)), Effect.exit)
        )
        const effect = yield* $(Ref.get(ref))
        assert.isTrue(Exit.isFailure(result) && Option.isSome(Cause.dieOption(result.i0)))
        assert.isTrue(effect)
      }))
  })
  it.effect("tapDefect - effectually peeks at defects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const result = yield* $(
        Effect.dieMessage("die"),
        Effect.tapDefect(() => Ref.set(ref, true)),
        Effect.exit
      )
      const effect = yield* $(Ref.get(ref))
      assert.isTrue(Exit.isFailure(result) && Option.isSome(Cause.dieOption(result.i0)))
      assert.isTrue(effect)
    }))
  it.effect("tapDefect - leaves failures", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const result = yield* $(
        Effect.fail("fail"),
        Effect.tapDefect(() => Ref.set(ref, true)),
        Effect.exit
      )
      const effect = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result, Exit.fail("fail"))
      assert.isFalse(effect)
    }))
  it.effect("unless - executes correct branch only", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.set(ref, 1), Effect.unless(constTrue))
      const v1 = yield* $(Ref.get(ref))
      yield* $(Ref.set(ref, 2), Effect.unless(constFalse))
      const v2 = yield* $(Ref.get(ref))
      const failure = new Error("expected")
      yield* $(Effect.fail(failure), Effect.unless(constTrue))
      const failed = yield* $(Effect.fail(failure), Effect.unless(constFalse), Effect.either)
      assert.strictEqual(v1, 0)
      assert.strictEqual(v2, 2)
      assert.deepStrictEqual(failed, Either.left(failure))
    }))
  it.effect("unlessEffect - executes condition effect and correct branch", () =>
    Effect.gen(function*($) {
      const effectRef = yield* $(Ref.make(0))
      const conditionRef = yield* $(Ref.make(0))
      const conditionTrue = pipe(Ref.update(conditionRef, (n) => n + 1), Effect.as(true))
      const conditionFalse = pipe(Ref.update(conditionRef, (n) => n + 1), Effect.as(false))
      yield* $(Ref.set(effectRef, 1), Effect.unlessEffect(conditionTrue))
      const v1 = yield* $(Ref.get(effectRef))
      const c1 = yield* $(Ref.get(conditionRef))
      yield* $(Ref.set(effectRef, 2), Effect.unlessEffect(conditionFalse))
      const v2 = yield* $(Ref.get(effectRef))
      const c2 = yield* $(Ref.get(conditionRef))
      const failure = new Error("expected")
      yield* $(Effect.fail(failure), Effect.unlessEffect(conditionTrue))
      const failed = yield* $(Effect.fail(failure), Effect.unlessEffect(conditionFalse), Effect.either)
      assert.strictEqual(v1, 0)
      assert.strictEqual(c1, 1)
      assert.strictEqual(v2, 2)
      assert.strictEqual(c2, 2)
      assert.deepStrictEqual(failed, Either.left(failure))
    }))
  it.effect("when - executes correct branch only", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.set(ref, 1), Effect.when(constFalse))
      const v1 = yield* $(Ref.get(ref))
      yield* $(Ref.set(ref, 2), Effect.when(constTrue))
      const v2 = yield* $(Ref.get(ref))
      const failure = new Error("expected")
      yield* $(Effect.fail(failure), Effect.when(constFalse))
      const failed = yield* $(Effect.fail(failure), Effect.when(constTrue), Effect.either)
      assert.strictEqual(v1, 0)
      assert.strictEqual(v2, 2)
      assert.deepStrictEqual(failed, Either.left(failure))
    }))
  it.effect("whenEffect - executes condition effect and correct branch", () =>
    Effect.gen(function*($) {
      const effectRef = yield* $(Ref.make(0))
      const conditionRef = yield* $(Ref.make(0))
      const conditionTrue = pipe(Ref.update(conditionRef, (n) => n + 1), Effect.as(true))
      const conditionFalse = pipe(Ref.update(conditionRef, (n) => n + 1), Effect.as(false))
      yield* $(Ref.set(effectRef, 1), Effect.whenEffect(conditionFalse))
      const v1 = yield* $(Ref.get(effectRef))
      const c1 = yield* $(Ref.get(conditionRef))
      yield* $(Ref.set(effectRef, 2), Effect.whenEffect(conditionTrue))
      const v2 = yield* $(Ref.get(effectRef))
      const c2 = yield* $(Ref.get(conditionRef))
      const failure = new Error("expected")
      yield* $(Effect.fail(failure), Effect.whenEffect(conditionFalse))
      const failed = yield* $(Effect.fail(failure), Effect.whenEffect(conditionTrue), Effect.either)
      assert.strictEqual(v1, 0)
      assert.strictEqual(c1, 1)
      assert.strictEqual(v2, 2)
      assert.strictEqual(c2, 2)
      assert.deepStrictEqual(failed, Either.left(failure))
    }))
  it.effect("zip/parallel - combines results", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.succeed(1),
        Effect.zip(Effect.succeed(2), { concurrent: true }),
        Effect.flatMap((tuple) => Effect.succeed(tuple[0] + tuple[1])),
        Effect.map((n) => n === 3)
      )
      assert.isTrue(result)
    }))
  it.effect("zip/parallel - does not swallow exit causes of loser", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          Effect.interrupt,
          Effect.zip(Effect.interrupt, { concurrent: true }),
          Effect.exit,
          Effect.map((exit) =>
            pipe(Exit.causeOption(exit), Option.map(Cause.interruptors), Option.getOrElse(() => HashSet.empty()))
          )
        )
      )
      assert.isAbove(HashSet.size(result), 0)
    }))
  it.effect("zip/parallel - does not report failure when interrupting loser after it succeeded", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          Effect.interrupt,
          Effect.zip(Effect.succeed(1), { concurrent: true }),
          Effect.sandbox,
          Effect.either,
          Effect.map(Either.mapLeft(Cause.isInterrupted))
        )
      )
      assert.deepStrictEqual(result, Either.left(true))
    }))
  it.effect("zip/parallel - paralellizes simple success values", () =>
    Effect.gen(function*($) {
      const countdown = (n: number): Effect.Effect<never, never, number> => {
        return n === 0
          ? Effect.succeed(0)
          : pipe(
            Effect.succeed(1),
            Effect.zip(Effect.succeed(2), { concurrent: true }),
            Effect.flatMap((tuple) => pipe(countdown(n - 1), Effect.map((y) => tuple[0] + tuple[1] + y)))
          )
      }
      const result = yield* $(countdown(50))
      assert.strictEqual(result, 150)
    }))
  it.effect("zip/parallel - does not kill fiber when forked on parent scope", () =>
    Effect.gen(function*($) {
      const latch1 = yield* $(Deferred.make<never, void>())
      const latch2 = yield* $(Deferred.make<never, void>())
      const latch3 = yield* $(Deferred.make<never, void>())
      const ref = yield* $(Ref.make(false))
      const left = Effect.uninterruptibleMask((restore) =>
        pipe(
          Deferred.succeed(latch2, void 0),
          Effect.zipRight(restore(pipe(Deferred.await(latch1), Effect.zipRight(Effect.succeed("foo"))))),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )
      )
      const right = pipe(Deferred.succeed(latch3, void 0), Effect.as(42))
      yield* $(
        Deferred.await(latch2),
        Effect.zipRight(Deferred.await(latch3)),
        Effect.zipRight(Deferred.succeed(latch1, void 0)),
        Effect.fork
      )

      const result = yield* $(Effect.fork(left), Effect.zip(right, { concurrent: true }))
      const leftInnerFiber = result[0]
      const rightResult = result[1]
      const leftResult = yield* $(Fiber.await(leftInnerFiber))
      const interrupted = yield* $(Ref.get(ref))
      assert.isFalse(interrupted)
      assert.deepStrictEqual(leftResult, Exit.succeed("foo"))
      assert.strictEqual(rightResult, 42)
    }))
})
