import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constVoid, identity, pipe } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("dropWhile - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 2, 3, 4, 5],
          Effect.dropWhile((n) => Effect.succeed(n % 2 === 1))
        )
      )
      assert.deepStrictEqual(Array.from(result), [2, 3, 4, 5])
    }))
  it.effect("dropWhile - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 1, 1],
          Effect.dropWhile(() => Effect.fail("Ouch")),
          Effect.either
        )
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
  it.effect("exists - determines whether any element satisfies the effectual predicate", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const result1 = yield* $(array, Effect.exists((n) => Effect.succeed(n > 3)))
      const result2 = yield* $(
        array,
        Effect.exists((n) => Effect.succeed(n > 5), {
          concurrency: "unbounded"
        })
      )
      assert.isTrue(result1)
      assert.isFalse(result2)
    }))
  it.effect("forAll - determines whether all elements satisfy the effectual predicate", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5, 6]
      const result1 = yield* $(array, Effect.every((n) => Effect.succeed(n > 3)))
      const result2 = yield* $(array, Effect.every((n) => Effect.succeed(n > 0)))
      assert.isFalse(result1)
      assert.isTrue(result2)
    }))
  it.effect("iterate - iterates with the specified effectual function", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.iterate(100, {
        while: (n) => n > 0,
        body: (n) => Effect.succeed(n - 1)
      }))
      assert.strictEqual(result, 0)
    }))
  it.effect("loop - loops with the specified effectual function", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(ReadonlyArray.empty<number>()))
      yield* $(
        Effect.loop(0, {
          while: (n) => n < 5,
          step: (n) => n + 1,
          body: (n) => Ref.update(ref, ReadonlyArray.append(n))
        })
      )
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result, [0, 1, 2, 3, 4])
    }))
  it.effect("loop/discard - loops with the specified effectual function", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(ReadonlyArray.empty<number>()))
      yield* $(Effect.loop(0, {
        while: (n) => n < 5,
        step: (n) => n + 1,
        body: (n) => Ref.update(ref, ReadonlyArray.append(n)),
        discard: true
      }))
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result, [0, 1, 2, 3, 4])
    }))
  it.effect("replicate - zero", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all(pipe(Effect.succeed(12), Effect.replicate(0))))
      assert.strictEqual(result.length, 0)
    }))
  it.effect("replicate - negative", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all(pipe(Effect.succeed(12), Effect.replicate(-2))))
      assert.strictEqual(result.length, 0)
    }))
  it.effect("replicate - positive", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all(pipe(Effect.succeed(12), Effect.replicate(2))))
      assert.deepStrictEqual(Array.from(result), [12, 12])
    }))
  it.effect(" - returns the list of results", () =>
    Effect.gen(function*($) {
      const result = yield* $([1, 2, 3, 4, 5, 6], Effect.forEach((n) => Effect.succeed(n + 1)))
      assert.deepStrictEqual(Array.from(result), [2, 3, 4, 5, 6, 7])
    }))
  it.effect("forEach - both evaluates effects and returns results in the same order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<string>()))
      const result = yield* $(
        Chunk.make("1", "2", "3"),
        Effect.forEach((s) =>
          pipe(
            Ref.update(ref, Chunk.prepend(s)),
            Effect.zipRight(Effect.sync(() => Number.parseInt(s)))
          )
        )
      )
      const effects = yield* $(Ref.get(ref), Effect.map(Chunk.reverse))
      assert.deepStrictEqual(Array.from(effects), ["1", "2", "3"])
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEach - fails if one of the effects fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        ["1", "h", "3"],
        Effect.forEach((s) =>
          Effect.sync(() => {
            const n = Number.parseInt(s)
            if (Number.isNaN(n)) {
              throw new Cause.IllegalArgumentException()
            }
            return n
          })
        ),
        Effect.exit
      )

      assert.deepStrictEqual(result, Exit.die(new Cause.IllegalArgumentException()))
    }))
  it.effect("forEach/discard - runs effects in order", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(ReadonlyArray.empty<number>()))
      yield* $([1, 2, 3, 4, 5], Effect.forEach((n) => Ref.update(ref, ReadonlyArray.append(n)), { discard: true }))
      const result = yield* $(Ref.get(ref))
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5])
    }))
  it.effect("forEach/discard - can be run twice", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const effect = pipe([1, 2, 3, 4, 5], Effect.forEach((n) => Ref.update(ref, (_) => _ + n), { discard: true }))
      yield* $(effect)
      yield* $(effect)
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 30)
    }))
  it.effect("forEach/concurrency - runs single task", () =>
    Effect.gen(function*($) {
      const result = yield* $([2], Effect.forEach((n) => Effect.succeed(n * 2), { concurrency: "unbounded" }))
      assert.deepStrictEqual(Array.from(result), [4])
    }))
  it.effect("forEach/concurrency - runs two tasks", () =>
    Effect.gen(function*($) {
      const result = yield* $([2, 3], Effect.forEach((n) => Effect.succeed(n * 2), { concurrency: "unbounded" }))
      assert.deepStrictEqual(Array.from(result), [4, 6])
    }))
  it.effect("forEach/concurrency - runs many tasks", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 100 }, (_, i) => i + 1)
      const result = yield* $(array, Effect.forEach((n) => Effect.succeed(n * 2), { concurrency: "unbounded" }))
      assert.deepStrictEqual(Array.from(result), array.map((n) => n * 2))
    }))
  it.effect("forEach/concurrency - runs a task that fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEach((n) => n === 5 ? Effect.fail("boom") : Effect.succeed(n * 2), { concurrency: "unbounded" }),
        Effect.flip
      )
      assert.strictEqual(result, "boom")
    }))
  it.effect("forEach/concurrency - runs two failed tasks", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEach((n) =>
          n === 5
            ? Effect.fail("boom1")
            : n === 8
            ? Effect.fail("boom2")
            : Effect.succeed(n * 2), { concurrency: "unbounded" }),
        Effect.flip
      )
      assert.isTrue(result === "boom1" || result === "boom2")
    }))
  it.effect("forEach/concurrency - runs a task that dies", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEach((n) => n === 5 ? Effect.dieMessage("boom") : Effect.succeed(n * 2), {
          concurrency: "unbounded"
        }),
        Effect.exit
      )
      assert.isTrue(Exit.isFailure(result) && Cause.isDie(result.i0))
    }))
  it.effect("forEach/concurrency - runs a task that is interrupted", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Array.from({ length: 10 }, (_, i) => i + 1),
        Effect.forEach((n) => n === 5 ? Effect.interrupt : Effect.succeed(n * 2), { concurrency: "unbounded" }),
        Effect.exit
      )
      assert.isTrue(Exit.isInterrupted(result))
    }))
  it.effect("forEach/concurrency - runs a task that throws an unsuspended exception", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [1],
        Effect.forEach((n) =>
          Effect.sync(() => {
            throw new Error(n.toString())
          }), { concurrency: "unbounded" }),
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.die(new Error("1")))
    }))
  it.effect("forEach/concurrency - returns results in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        ["1", "2", "3"],
        Effect.forEach((s) => Effect.sync(() => Number.parseInt(s)), { concurrency: "unbounded" })
      )
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEach/concurrency - runs effects in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(
        pipe(
          [Effect.never, Deferred.succeed(deferred, void 0)],
          Effect.forEach(identity, { concurrency: "unbounded" }),
          Effect.fork
        )
      )
      const result = yield* $(Deferred.await(deferred))
      assert.isUndefined(result)
    }))
  it.effect("forEach/concurrency - propagates error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [1, 2, 3, 4, 5, 6],
        Effect.forEach((n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd"), { concurrency: "unbounded" }),
        Effect.flip
      )
      assert.strictEqual(result, "not odd")
    }))
  it.effect("forEach/concurrency - interrupts effects on first failure", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const deferred = yield* $(Deferred.make<never, void>())
      const actions = [
        Effect.never,
        Effect.succeed(1),
        Effect.fail("C"),
        pipe(Deferred.await(deferred), Effect.zipRight(Ref.set(ref, true)), Effect.as(1))
      ]
      const error = yield* $(actions, Effect.forEach(identity, { concurrency: "unbounded" }), Effect.flip)
      const value = yield* $(Ref.get(ref))
      assert.strictEqual(error, "C")
      assert.isFalse(value)
    }))
  it.effect("forEach/concurrency - does not kill fiber when forked on the parent scope", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const fibers = yield* $(
        Array.from({ length: 100 }, (_, i) => i + 1),
        Effect.forEach(() => pipe(Ref.update(ref, (_) => _ + 1), Effect.fork), { concurrency: "unbounded" })
      )
      yield* $(fibers, Effect.forEach(Fiber.await))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 100)
    }))
  it.effect("forEach/concurrency - parallelism - returns the results in the appropriate order", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 2, 3],
          Effect.forEach((n) => Effect.succeed(n.toString()), { concurrency: 2 })
        )
      )
      assert.deepStrictEqual(Array.from(result), ["1", "2", "3"])
    }))
  it.effect("forEach/concurrency - parallelism - works on large lists", () =>
    Effect.gen(function*($) {
      const parallelism = 10
      const array = Array.from({ length: 100000 }, (_, i) => i)
      const result = yield* $(
        pipe(
          array,
          Effect.forEach((n) => Effect.succeed(n), { concurrency: parallelism })
        )
      )
      assert.deepStrictEqual(Array.from(result), array)
    }))
  it.effect("forEach/concurrency - parallelism - runs effects in parallel", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      yield* $(
        pipe(
          [Effect.never, Deferred.succeed(deferred, void 0)],
          Effect.forEach(identity, { concurrency: 2 }),
          Effect.fork
        )
      )
      const result = yield* $(Deferred.await(deferred))
      assert.isUndefined(result)
    }))
  it.effect("forEach/concurrency - parallelism - propagates error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [1, 2, 3, 4, 5, 6],
        Effect.forEach((n) => n % 2 !== 0 ? Effect.succeed(n) : Effect.fail("not odd"), { concurrency: 4 }),
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("not odd"))
    }))
  it.effect("forEach/concurrency - parallelism - interrupts effects on first failure", () =>
    Effect.gen(function*($) {
      const actions = [
        Effect.never,
        Effect.succeed(1),
        Effect.fail("C")
      ]
      const result = yield* $(
        actions,
        Effect.forEach(identity, { concurrency: 4 }),
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("C"))
    }))
  it.effect("forEach/concurrency+discard - accumulates errors", () =>
    Effect.gen(function*($) {
      const task = (
        started: Ref.Ref<number>,
        trigger: Deferred.Deferred<never, void>,
        n: number
      ): Effect.Effect<never, number, void> => {
        return pipe(
          Ref.updateAndGet(started, (n) => n + 1),
          Effect.flatMap((count) =>
            pipe(
              Deferred.succeed(trigger, void 0),
              Effect.when(() => count === 3),
              Effect.zipRight(Deferred.await(trigger)),
              Effect.zipRight(Effect.fail(n))
            )
          )
        )
      }
      const started = yield* $(Ref.make(0))
      const trigger = yield* $(Deferred.make<never, void>())
      const result = yield* $(
        [1, 2, 3],
        Effect.forEach((n) => pipe(task(started, trigger, n), Effect.uninterruptible), {
          concurrency: "unbounded",
          discard: true
        }),
        Effect.matchCause({
          onFailure: Cause.failures,
          onSuccess: () => Chunk.empty<number>()
        })
      )
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("forEach/concurrency+discard - runs all effects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(
        [1, 2, 3, 4, 5],
        Effect.forEach((n) => Ref.update(ref, Chunk.prepend(n)), {
          concurrency: "unbounded",
          discard: true
        })
      )
      const result = yield* $(Ref.get(ref), Effect.map(Chunk.reverse))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))
  it.effect("forEach/concurrency+discard - completes on empty input", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [],
        Effect.forEach(() => Effect.unit, {
          concurrency: "unbounded",
          discard: true
        })
      )
      assert.isUndefined(result)
    }))
  it.effect("forEach/concurrency+discard - parallelism - runs all effects", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(
        [1, 2, 3, 4, 5],
        Effect.forEach((n) => Ref.update(ref, Chunk.prepend(n)), {
          concurrency: 2,
          discard: true
        })
      )
      const result = yield* $(Ref.get(ref), Effect.map(Chunk.reverse))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))
  it.effect("merge - on flipped result", () =>
    Effect.gen(function*($) {
      const effect: Effect.Effect<never, number, number> = Effect.succeed(1)
      const a = yield* $(Effect.merge(effect))
      const b = yield* $(Effect.merge(Effect.flip(effect)))
      assert.strictEqual(a, b)
    }))
  it.effect("mergeAll - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe([] as ReadonlyArray<Effect.Effect<never, never, unknown>>, Effect.mergeAll(zeroElement, () => nonZero))
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("mergeAll - merge list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $([3, 5, 7].map(Effect.succeed), Effect.mergeAll(1, (b, a) => b + a))
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("mergeAll - should work when Z is an interable", () =>
    Effect.gen(function*($) {
      const result = yield* $([3, 5, 7].map(Effect.succeed), Effect.mergeAll([] as Array<number>, (b, a) => [...b, a]))
      assert.deepStrictEqual(result, [3, 5, 7])
    }))
  it.effect("mergeAll - should work when Z is a function", () =>
    Effect.gen(function*($) {
      const result = yield* $([3, 5, 7].map(Effect.succeed), Effect.mergeAll(() => 1, (_b, a) => () => a))
      assert.deepStrictEqual(result(), 7)
    }))
  it.effect("mergeAll - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit, Effect.fail(1)]
      const result = yield* $(effects, Effect.mergeAll(void 0 as void, constVoid), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail(1))
    }))
  it.effect("mergeAll/concurrency - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe(
          [] as ReadonlyArray<Effect.Effect<never, never, unknown>>,
          Effect.mergeAll(zeroElement, () => nonZero, {
            concurrency: "unbounded"
          })
        )
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("mergeAll/concurrency - merge list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [3, 5, 7].map(Effect.succeed),
        Effect.mergeAll(1, (b, a) => b + a, {
          concurrency: "unbounded"
        })
      )
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("mergeAll/concurrency - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit, Effect.fail(1)]
      const result = yield* $(
        effects,
        Effect.mergeAll(void 0 as void, constVoid, {
          concurrency: "unbounded"
        }),
        Effect.exit
      )
      assert.deepStrictEqual(result, Exit.failCause(Cause.fail(1)))
    }))
  it.effect("partition - collects only successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(array, Effect.partition(Effect.succeed))
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partition - collects only failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(array, Effect.partition(Effect.fail))
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partition - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(
        pipe(array, Effect.partition((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n)))
      )
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("partition - evaluates effects in correct order", () =>
    Effect.gen(function*($) {
      const array = [2, 4, 6, 3, 5, 6]
      const ref = yield* $(Ref.make(Chunk.empty<number>()))
      yield* $(array, Effect.partition((n) => Ref.update(ref, Chunk.prepend(n))))
      const result = yield* $(Ref.get(ref), Effect.map(Chunk.reverse))
      assert.deepStrictEqual(Array.from(result), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("partition/concurrency - collects successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const [left, right] = yield* $(
        array,
        Effect.partition(Effect.succeed, {
          concurrency: "unbounded"
        })
      )
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partition/concurrency - collects failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(
        array,
        Effect.partition(Effect.fail, {
          concurrency: "unbounded"
        })
      )
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partition/concurrency - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(
        pipe(
          array,
          Effect.partition((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n), {
            concurrency: "unbounded"
          })
        )
      )
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("partition/concurrency - parallelism - collects successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 1000 }, (_, i) => i)
      const [left, right] = yield* $(
        array,
        Effect.partition(Effect.succeed, {
          concurrency: 3
        })
      )
      assert.deepStrictEqual(Array.from(left), [])
      assert.deepStrictEqual(Array.from(right), array)
    }))
  it.effect("partition/concurrency - parallelism - collects failures", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, () => 0)
      const [left, right] = yield* $(
        array,
        Effect.partition(Effect.fail, { concurrency: 3 })
      )
      assert.deepStrictEqual(Array.from(left), array)
      assert.deepStrictEqual(Array.from(right), [])
    }))
  it.effect("partition/concurrency - parallelism - collects failures and successes", () =>
    Effect.gen(function*($) {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const [left, right] = yield* $(
        array,
        Effect.partition((n) => n % 2 === 0 ? Effect.fail(n) : Effect.succeed(n), {
          concurrency: 3
        })
      )
      assert.deepStrictEqual(Array.from(left), [0, 2, 4, 6, 8])
      assert.deepStrictEqual(Array.from(right), [1, 3, 5, 7, 9])
    }))
  it.effect("reduce - with a successful step function sums the list properly", () =>
    Effect.gen(function*($) {
      const result = yield* $([1, 2, 3, 4, 5], Effect.reduce(0, (acc, curr) => Effect.succeed(acc + curr)))
      assert.strictEqual(result, 15)
    }))
  it.effect("reduce - with a failing step function returns a failed IO", () =>
    Effect.gen(function*($) {
      const result = yield* $([1, 2, 3, 4, 5], Effect.reduce(0, () => Effect.fail("fail")), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail("fail"))
    }))
  it.effect("reduce - run sequentially from left to right", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe([1, 2, 3, 4, 5], Effect.reduce([] as ReadonlyArray<number>, (acc, curr) => Effect.succeed([...acc, curr])))
      )
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5])
    }))
  it.effect("reduceRight - with a successful step function sums the list properly", () =>
    Effect.gen(function*($) {
      const result = yield* $([1, 2, 3, 4, 5], Effect.reduceRight(0, (acc, curr) => Effect.succeed(acc + curr)))
      assert.strictEqual(result, 15)
    }))
  it.effect("reduceRight - with a failing step function returns a failed IO", () =>
    Effect.gen(function*($) {
      const result = yield* $([1, 2, 3, 4, 5], Effect.reduceRight(0, () => Effect.fail("fail")), Effect.exit)
      assert.deepStrictEqual(result, Exit.fail("fail"))
    }))
  it.effect("reduceRight - run sequentially from right to left", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        [1, 2, 3, 4, 5],
        Effect.reduceRight([] as ReadonlyArray<number>, (curr, acc) => Effect.succeed([curr, ...acc]))
      )
      assert.deepStrictEqual(result, [1, 2, 3, 4, 5])
    }))
  it.effect("reduceEffect/concurrency - return zero element on empty input", () =>
    Effect.gen(function*($) {
      const zeroElement = 42
      const nonZero = 43
      const result = yield* $(
        pipe(
          [] as ReadonlyArray<Effect.Effect<never, never, number>>,
          Effect.reduceEffect(Effect.succeed(zeroElement), () => nonZero, {
            concurrency: "unbounded"
          })
        )
      )
      assert.strictEqual(result, zeroElement)
    }))
  it.effect("reduceEffect/concurrency - reduce list using function", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [3, 5, 7].map(Effect.succeed),
          Effect.reduceEffect(Effect.succeed(1), (acc, a) => acc + a, {
            concurrency: "unbounded"
          })
        )
      )
      assert.strictEqual(result, 1 + 3 + 5 + 7)
    }))
  it.effect("reduceEffect/concurrency - return error if zero is an error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [Effect.unit, Effect.unit],
          Effect.reduceEffect(Effect.fail(1), constVoid, {
            concurrency: "unbounded"
          }),
          Effect.exit
        )
      )
      assert.deepStrictEqual(result, Exit.failCause(Cause.fail(1)))
    }))
  it.effect("reduceEffect/concurrency - return error if it exists in list", () =>
    Effect.gen(function*($) {
      const effects: ReadonlyArray<Effect.Effect<never, number, void>> = [Effect.unit, Effect.fail(1)]
      const result = yield* $(
        pipe(
          effects,
          Effect.reduceEffect(Effect.unit as Effect.Effect<never, number, void>, constVoid, {
            concurrency: "unbounded"
          }),
          Effect.exit
        )
      )
      assert.deepStrictEqual(result, Exit.failCause(Cause.fail(1)))
    }))
  it.effect("takeUntil - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.takeUntil(
          [1, 2, 3, 4, 5],
          (n) => Effect.succeed(n >= 3)
        )
      )
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("takeUntil - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 1, 1],
          Effect.takeUntil(() => Effect.fail("Ouch")),
          Effect.either
        )
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
  it.effect("takeWhile - happy path", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 2, 3, 4, 5],
          Effect.takeWhile((n) => Effect.succeed(n % 2 === 1))
        )
      )
      assert.deepStrictEqual(Array.from(result), [1])
    }))
  it.effect("takeWhile - error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [1, 1, 1],
          Effect.takeWhile(() => Effect.fail("Ouch")),
          Effect.either
        )
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
})
