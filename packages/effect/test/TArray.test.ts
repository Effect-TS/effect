import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertLeft,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from "@effect/vitest/utils"
import { Cause, Chunk, Effect, Exit, Fiber, identity, Number, Option, pipe, STM, TArray, TRef } from "effect"
import { constFalse, constTrue } from "effect/Function"

const largePrime = 223

const makeRepeats = (blocks: number, length: number): STM.STM<TArray.TArray<number>> =>
  TArray.fromIterable(Array.from({ length: blocks * length }, (_, i) => (i % length) + 1))

const makeStair = (length: number): STM.STM<TArray.TArray<number>> =>
  TArray.fromIterable(Array.from({ length }, (_, i) => i + 1))

const makeStairWithHoles = (length: number): STM.STM<TArray.TArray<Option.Option<number>>> =>
  TArray.fromIterable(Array.from({ length }, (_, i) => i % 3 === 0 ? Option.none() : Option.some(i)))

const makeTArray = <A>(length: number, value: A): STM.STM<TArray.TArray<A>> =>
  TArray.fromIterable(Array.from({ length }, () => value))

const valuesOf = <A>(array: TArray.TArray<A>): STM.STM<Array<A>> =>
  pipe(array, TArray.reduce<Array<A>, A>([], (acc, a) => [...acc, a]))

describe("TArray", () => {
  it.effect("collectFirst - finds and transforms correctly", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirst((option) =>
          Option.isSome(option) && option.value > 2 ?
            Option.some(String(option.value)) :
            Option.none()
        )
      ))
      assertSome(result, "4")
    }))

  it.effect("collectFirst - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray<Option.Option<number>>(0, Option.none()))
      const result = yield* (pipe(array, TArray.collectFirst(identity)))
      assertNone(result)
    }))

  it.effect("collectFirst - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirst((option) =>
          Option.isSome(option) && option.value > n ?
            Option.some(String(option.value)) :
            Option.none()
        )
      ))
      assertNone(result)
    }))

  it.effect("collectFirst - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStairWithHoles(n))
      const fiber = yield* (pipe(
        array,
        TArray.collectFirst((option) =>
          Option.isSome(option) && option.value % largePrime === 0 ?
            Option.some(String(option.value)) :
            Option.none()
        ),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => Option.some(1))))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === String(largePrime)) ||
          Option.isNone(result)
      )
    }))

  it.effect("collectFirstSTM - finds and transforms correctly", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) && option.value > 2 ?
            Option.some(STM.succeed(String(option.value))) :
            Option.none()
        )
      ))
      assertSome(result, "4")
    }))

  it.effect("collectFirstSTM - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray<Option.Option<number>>(0, Option.none()))
      const result = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) ?
            Option.some(STM.succeed(option.value)) :
            Option.none()
        )
      ))
      assertNone(result)
    }))

  it.effect("collectFirstSTM - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) && option.value > n ?
            Option.some(STM.succeed(String(option.value))) :
            Option.none()
        )
      ))
      assertNone(result)
    }))

  it.effect("collectFirstSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStairWithHoles(n))
      const fiber = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) && option.value % largePrime === 0 ?
            Option.some(STM.succeed(String(option.value))) :
            Option.none()
        ),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => Option.some(1))))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === String(largePrime)) ||
          Option.isNone(result)
      )
    }))

  it.effect("collectFirstSTM - fails on errors before result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) && option.value > 2 ?
            Option.some(STM.succeed(String(option.value))) :
            Option.some(STM.fail("boom"))
        ),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("collectFirstSTM - succeeds on errors after result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStairWithHoles(n))
      const result = yield* (pipe(
        array,
        TArray.collectFirstSTM((option) =>
          Option.isSome(option) ?
            option.value > 2 ?
              Option.some(STM.succeed(String(option.value))) :
              option.value === 7 ?
              Option.some(STM.fail("boom")) :
              Option.none() :
            Option.none()
        )
      ))
      assertSome(result, "4")
    }))

  it.effect("contains - true when in the array", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.contains(3)))
      assertTrue(result)
    }))

  it.effect("contains - false when not in the array", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.contains(n + 1)))
      assertFalse(result)
    }))

  it.effect("contains - false for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.contains(0)))
      assertFalse(result)
    }))

  it.effect("count - computes correct sum", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.count((n) => n % 2 === 0)))
      strictEqual(result, 5)
    }))

  it.effect("count - zero when the predicate does not match", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.count((i) => i > n)))
      strictEqual(result, 0)
    }))

  it.effect("count - zero for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.count(constTrue)))
      strictEqual(result, 0)
    }))

  it.effect("countSTM - computes correct sum", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.countSTM((n) => STM.succeed(n % 2 === 0))))
      strictEqual(result, 5)
    }))

  it.effect("countSTM - zero when the predicate does not match", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.countSTM((i) => STM.succeed(i > n))))
      strictEqual(result, 0)
    }))

  it.effect("countSTM - zero for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.countSTM(() => STM.succeed(true))))
      strictEqual(result, 0)
    }))

  it.effect("every - detects satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.every((i) => i < n + 1)))
      assertTrue(result)
    }))

  it.effect("every - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.every((i) => i < n - 1)))
      assertFalse(result)
    }))

  it.effect("every - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.every(constFalse)))
      assertTrue(result)
    }))

  it.effect("everySTM - detects satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.everySTM((i) => STM.succeed(i < n + 1))))
      assertTrue(result)
    }))

  it.effect("everySTM - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.everySTM((i) => STM.succeed(i < n - 1))))
      assertFalse(result)
    }))

  it.effect("everySTM - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.everySTM(() => STM.succeed(false))))
      assertTrue(result)
    }))

  it.effect("everySTM - fails for errors before counterexample", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.everySTM((n) => n === 4 ? STM.fail("boom") : STM.succeed(n !== 5)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("everySTM - fails for errors after counterexample", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.everySTM((n) => n === 6 ? STM.fail("boom") : STM.succeed(n === 5)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("get - happy path", () =>
    Effect.gen(function*() {
      const result = yield* (pipe(
        makeTArray(1, 42),
        STM.flatMap(TArray.get(0))
      ))
      strictEqual(result, 42)
    }))

  it.effect("findFirst - is correct", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirst((n) => n % 5 === 0)))
      assertSome(result, 5)
    }))

  it.effect("findFirst - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findFirst(constTrue)))
      assertNone(result)
    }))

  it.effect("findFirst - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirst((i) => i > n)))
      assertNone(result)
    }))

  it.effect("findFirst - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findFirst((n) => n % largePrime === 0),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(1, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime) ||
          Option.isNone(result)
      )
    }))

  it.effect("findFirstIndex - correct index if in array", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndex(2)))
      assertSome(result, 1)
    }))

  it.effect("findFirstIndex - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findFirstIndex(1)))
      assertNone(result)
    }))

  it.effect("findFirstIndex - none if absent", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndex(4)))
      assertNone(result)
    }))

  it.effect("findFirstIndexFrom - correct index if in array, with offset", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndexFrom(2, 2)))
      assertSome(result, 4)
    }))

  it.effect("findFirstIndexFrom - none if absent after offset", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndexFrom(1, 7)))
      assertNone(result)
    }))

  it.effect("findFirstIndexFrom - none for a negative offset", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndexFrom(1, -1)))
      assertNone(result)
    }))

  it.effect("findFirstIndexFrom - none for an offset that is too large", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findFirstIndexFrom(1, 9)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhere - determines the correct index", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhere((n) => n % 5 === 0)))
      assertSome(result, 4)
    }))

  it.effect("findFirstIndexWhere - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findFirstIndexWhere(constTrue)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhere - none for empty array", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhere((i) => i > n)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhere - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findFirstIndexWhere((n) => n % largePrime === 0),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime - 1) ||
          Option.isNone(result)
      )
    }))

  it.effect("findFirstIndexWhereFrom - determines the correct index, with offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFrom((n) => n % 2 === 0, 5)))
      assertSome(result, 5)
    }))

  it.effect("findFirstIndexWhereFrom - none if absent after offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFrom((n) => n % 7 === 0, 7)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereFrom - none for a negative offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFrom(constTrue, -1)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereFrom - none for an offset that is too large", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFrom(constTrue, n + 1)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereSTM - determines the correct index", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereSTM((n) => STM.succeed(n % 5 === 0))))
      assertSome(result, 4)
    }))

  it.effect("findFirstIndexWhereSTM - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findFirstIndexWhereSTM(() => STM.succeed(true))))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereSTM - none for empty array", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereSTM((i) => STM.succeed(i > n))))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findFirstIndexWhereSTM((n) => STM.succeed(n % largePrime === 0)),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime - 1) ||
          Option.isNone(result)
      )
    }))

  it.effect("findFirstIndexWhereSTM - fails on errors before result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findFirstIndexWhereSTM((n) => n === 4 ? STM.fail("boom") : STM.succeed(n % 5 === 0)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("findFirstIndexWhereSTM - succeeds on errors after result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findFirstIndexWhereSTM((n) => n === 6 ? STM.fail("boom") : STM.succeed(n % 5 === 0))
      ))
      assertSome(result, 4)
    }))

  it.effect("findFirstIndexWhereFromSTM - determines the correct index, with offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFromSTM((n) => STM.succeed(n % 2 === 0), 5)))
      assertSome(result, 5)
    }))

  it.effect("findFirstIndexWhereFromSTM - none if absent after offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFromSTM((n) => STM.succeed(n % 7 === 0), 7)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereFromSTM - none for a negative offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFromSTM(() => STM.succeed(true), -1)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWherFromeSTM - none for an offset that is too large", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstIndexWhereFromSTM(() => STM.succeed(true), n + 1)))
      assertNone(result)
    }))

  it.effect("findFirstIndexWhereFromSTM - succeeds when error excluded by offset", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findFirstIndexWhereFromSTM((n) =>
          n === 1
            ? STM.fail("boom")
            : STM.succeed(n % 5 === 0), 2)
      ))
      assertSome(result, 4)
    }))

  it.effect("findFirstSTM - is correct", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstSTM((n) => STM.succeed(n % 5 === 0))))
      assertSome(result, 5)
    }))

  it.effect("findFirstSTM - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findFirstSTM(() => STM.succeed(true))))
      assertNone(result)
    }))

  it.effect("findFirstSTM - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findFirstSTM((i) => STM.succeed(i > n))))
      assertNone(result)
    }))

  it.effect("findFirstSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findFirstSTM((n) => STM.succeed(n % largePrime === 0)),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(1, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime) ||
          Option.isNone(result)
      )
    }))

  it.effect("findFirstSTM - fails on errors before result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findFirstSTM((n) => n === 4 ? STM.fail("boom") : STM.succeed(n % 5 === 0)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("findFirstSTM - succeeds on errors after result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findFirstSTM((n) => n === 6 ? STM.fail("boom") : STM.succeed(n % 5 === 0))
      ))
      assertSome(result, 5)
    }))

  it.effect("findLast - is correct", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findLast((n) => n % 5 === 0)))
      assertSome(result, 10)
    }))

  it.effect("findLast - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findLast(constTrue)))
      assertNone(result)
    }))

  it.effect("findLast - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findLast((i) => i > n)))
      assertNone(result)
    }))

  it.effect("findLast - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findLast((n) => n % largePrime === 0),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(1, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime) ||
          Option.isNone(result)
      )
    }))

  it.effect("findLastIndex - correct index if in array", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndex(2)))
      assertSome(result, 7)
    }))

  it.effect("findLastIndex - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findLastIndex(1)))
      assertNone(result)
    }))

  it.effect("findLastIndex - none if absent", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndex(4)))
      assertNone(result)
    }))

  it.effect("findLastIndexFrom - correct index if in array, with limit", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndexFrom(2, 6)))
      assertSome(result, 4)
    }))

  it.effect("findLastIndexFrom - none if absent before limit", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndexFrom(3, 1)))
      assertNone(result)
    }))

  it.effect("findLastIndexFrom - none for a negative limit", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndexFrom(2, -1)))
      assertNone(result)
    }))

  it.effect("findLastIndexFrom - none for a limit that is too large", () =>
    Effect.gen(function*() {
      const array = yield* (makeRepeats(3, 3))
      const result = yield* (pipe(array, TArray.findLastIndexFrom(2, 9)))
      assertNone(result)
    }))

  it.effect("findLastSTM - is correct", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findLastSTM((n) => STM.succeed(n % 5 === 0))))
      assertSome(result, 10)
    }))

  it.effect("findLastSTM - succeeds for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.findLastSTM(() => STM.succeed(true))))
      assertNone(result)
    }))

  it.effect("findLastSTM - fails to find absent", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.findLastSTM((i) => STM.succeed(i > n))))
      assertNone(result)
    }))

  it.effect("findLastSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(
        array,
        TArray.findLastSTM((n) => STM.succeed(n % largePrime === 0)),
        Effect.fork
      ))
      yield* (pipe(
        Chunk.range(1, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        (Option.isSome(result) && result.value === largePrime) ||
          Option.isNone(result)
      )
    }))

  it.effect("findLastSTM - succeeds on errors before result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findLastSTM((n) => n === 4 ? STM.fail("boom") : STM.succeed(n % 7 === 0))
      ))
      assertSome(result, 7)
    }))

  it.effect("findLastSTM - fails on errors after result found", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.findLastSTM((n) => n === 8 ? STM.fail("boom") : STM.succeed(n % 7 === 0)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("forEach - side-effect is transactional", () =>
    Effect.gen(function*() {
      const n = 10
      const ref = yield* (TRef.make(0))
      const array = yield* (makeTArray(n, 1))
      const fiber = yield* (pipe(
        array,
        TArray.forEach((n) => pipe(ref, TRef.update((i) => i + n))),
        Effect.fork
      ))
      const result = yield* (TRef.get(ref))
      yield* (Fiber.join(fiber))
      assertTrue(result === 0 || result === n)
    }))

  it.effect("get - should fail when the index is out of bounds", () =>
    Effect.gen(function*() {
      const result = yield* (pipe(
        makeTArray(1, 42),
        STM.flatMap(TArray.get(-1)),
        Effect.exit
      ))
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("Index out of bounds")))
    }))

  it.effect("headOption - retrieves the first item in the array", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (TArray.headOption(array))
      assertSome(result, 1)
    }))

  it.effect("headOption - is none for an empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (TArray.headOption(array))
      assertNone(result)
    }))

  it.effect("lastOption - retrieves the last entry", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (TArray.lastOption(array))
      assertSome(result, n)
    }))

  it.effect("lastOption - is none for an empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (TArray.lastOption(array))
      assertNone(result)
    }))

  it.effect("maxOption - computes correct maximum", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.maxOption(Number.Order)))
      assertSome(result, n)
    }))

  it.effect("maxOption - returns none for an empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.maxOption(Number.Order)))
      assertNone(result)
    }))

  it.effect("minOption - computes correct minimum", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.minOption(Number.Order)))
      assertSome(result, 1)
    }))

  it.effect("minOption - returns none for an empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.maxOption(Number.Order)))
      assertNone(result)
    }))

  it.effect("reduce - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeTArray(n, 0))
      const fiber = yield* (pipe(array, TArray.reduce(0, (x, y) => x + y), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, (n) => n + 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(result === 0 || result === n)
    }))

  it.effect("reduceOption - reduces correctly", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.reduceOption((x, y) => x + y)))
      assertSome(result, (n * (n + 1)) / 2)
    }))

  it.effect("reduceOption - single entry", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 1))
      const result = yield* (pipe(array, TArray.reduceOption((x, y) => x + y)))
      assertSome(result, 1)
    }))

  it.effect("reduceOption - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.reduceOption((x, y) => x + y)))
      assertNone(result)
    }))

  it.effect("reduceOption - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(array, TArray.reduceOption((x, y) => x + y), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        Option.isSome(result) &&
          (result.value === (n * (n + 1)) / 2 || result.value === n)
      )
    }))

  it.effect("reduceOptionSTM - reduces correctly", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.reduceOptionSTM((x, y) => STM.succeed(x + y))))
      assertSome(result, (n * (n + 1)) / 2)
    }))

  it.effect("reduceOptionSTM - single entry", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 1))
      const result = yield* (pipe(array, TArray.reduceOptionSTM((x, y) => STM.succeed(x + y))))
      assertSome(result, 1)
    }))

  it.effect("reduceOptionSTM - none for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.reduceOptionSTM((x, y) => STM.succeed(x + y))))
      assertNone(result)
    }))

  it.effect("reduceOptionSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeStair(n))
      const fiber = yield* (pipe(array, TArray.reduceOptionSTM((x, y) => STM.succeed(x + y)), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, () => 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(
        Option.isSome(result) &&
          (result.value === (n * (n + 1)) / 2 || result.value === n)
      )
    }))

  it.effect("reduceOptionSTM - fails on errors", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.reduceOptionSTM((x, y) => y === 4 ? STM.fail("boom") : STM.succeed(x + y)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("reduceSTM - is atomic", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeTArray(n, 0))
      const fiber = yield* (pipe(array, TArray.reduceSTM(0, (x, y) => STM.succeed(x + y)), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, (n) => n + 1)))
      ))
      const result = yield* (Fiber.join(fiber))
      assertTrue(result === 0 || result === n)
    }))

  it.effect("reduceSTM - returns failures", () =>
    Effect.gen(function*() {
      const n = 1_000
      const failInTheMiddle = (acc: number, n: number): STM.STM<number, string> =>
        acc === Math.floor(n / 2) ? STM.fail("boom") : STM.succeed(acc + n)
      const array = yield* (makeTArray(n, 1))
      const result = yield* (pipe(array, TArray.reduceSTM(0, failInTheMiddle), STM.either))
      assertLeft(result, "boom")
    }))

  it.effect("size - returns the correct size", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = TArray.size(array)
      strictEqual(result, n)
    }))

  it.effect("some - detects satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.some((n) => n % 2 === 0)))
      assertTrue(result)
    }))

  it.effect("some - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.some((n) => n % 11 === 0)))
      assertFalse(result)
    }))

  it.effect("some - false for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.some(constTrue)))
      assertFalse(result)
    }))

  it.effect("someSTM - detects satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.someSTM((n) => STM.succeed(n % 2 === 0))))
      assertTrue(result)
    }))

  it.effect("someSTM - detects lack of satisfaction", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(array, TArray.someSTM((n) => STM.succeed(n % 11 === 0))))
      assertFalse(result)
    }))

  it.effect("someSTM - false for empty array", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.empty<number>())
      const result = yield* (pipe(array, TArray.someSTM(() => STM.succeed(true))))
      assertFalse(result)
    }))

  it.effect("someSTM - fails for errors before witness", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.someSTM((n) => n === 4 ? STM.fail("boom") : STM.succeed(n === 5)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("someSTM - fails for errors after witness", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeStair(n))
      const result = yield* (pipe(
        array,
        TArray.someSTM((n) => n === 6 ? STM.fail("boom") : STM.succeed(n === 5)),
        STM.flip
      ))
      strictEqual(result, "boom")
    }))

  it.effect("transform - updates values atomically", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeTArray(n, "a"))
      const fiber = yield* (pipe(array, TArray.transform((s) => s + "+b"), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, (s) => s + "+c")))
      ))
      yield* (Fiber.join(fiber))
      const first = yield* (pipe(array, TArray.get(0)))
      const last = yield* (pipe(array, TArray.get(n - 1)))
      assertTrue(
        (first === "a+b+c" && last === "a+b+c") ||
          (first === "a+c+b" && last === "a+c+b")
      )
    }))

  it.effect("transformSTM - updates values atomically", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeTArray(n, "a"))
      const fiber = yield* (pipe(array, TArray.transformSTM((s) => STM.succeed(s + "+b")), Effect.fork))
      yield* (pipe(
        Chunk.range(0, n - 1),
        STM.forEach((n) => pipe(array, TArray.update(n, (s) => s + "+c")))
      ))
      yield* (Fiber.join(fiber))
      const first = yield* (pipe(array, TArray.get(0)))
      const last = yield* (pipe(array, TArray.get(n - 1)))
      assertTrue(
        (first === "a+b+c" && last === "a+b+c") ||
          (first === "a+c+b" && last === "a+c+b")
      )
    }))

  it.effect("transformSTM - updates all or nothing", () =>
    Effect.gen(function*() {
      const n = 1_000
      const array = yield* (makeTArray(n, 0))
      yield* (pipe(array, TArray.update(Math.floor(n / 2), () => 1)))
      const result = yield* (pipe(
        array,
        TArray.transformSTM((n) => n === 0 ? STM.succeed(42) : STM.fail("boom")),
        STM.either
      ))
      const first = yield* (pipe(array, TArray.get(0)))
      strictEqual(first, 0)
      assertLeft(result, "boom")
    }))

  it.effect("update - happy path", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 42))
      const result = yield* (pipe(
        array,
        TArray.update(0, (n) => -n),
        STM.zipRight(valuesOf(array))
      ))
      deepStrictEqual(result, [-42])
    }))

  it.effect("update - dies with index out of bounds", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 42))
      const result = yield* (pipe(array, TArray.update(-1, identity), Effect.exit))
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("Index out of bounds")))
    }))

  it.effect("updateSTM - happy path", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 42))
      const result = yield* (pipe(
        array,
        TArray.updateSTM(0, (n) => STM.succeed(-n)),
        STM.zipRight(valuesOf(array))
      ))
      deepStrictEqual(result, [-42])
    }))

  it.effect("updateSTM - dies with index out of bounds", () =>
    Effect.gen(function*() {
      const array = yield* (makeTArray(1, 42))
      const result = yield* (pipe(array, TArray.updateSTM(-1, (n) => STM.succeed(n)), Effect.exit))
      deepStrictEqual(result, Exit.die(new Cause.RuntimeException("Index out of bounds")))
    }))

  it.effect("updateSTM - handles failures", () =>
    Effect.gen(function*() {
      const n = 10
      const array = yield* (makeTArray(n, 0))
      const result = yield* (pipe(
        array,
        TArray.updateSTM(0, (_: number) => STM.fail("boom")),
        STM.commit,
        Effect.either
      ))
      assertLeft(result, "boom")
    }))

  it.effect("toChunk", () =>
    Effect.gen(function*() {
      const array = yield* (TArray.make(1, 2, 3, 4, 5))
      const result = yield* (TArray.toArray(array))
      deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))
})
