import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Array, Cause, Chunk, Data, Effect, Random } from "effect"

describe("Random", () => {
  it.effect("integer is correctly distributed", () =>
    Effect.gen(function*() {
      const tenYearsMillis = 10 * 365 * 24 * 60 * 60 * 1000
      let lastRandom = 0
      while (lastRandom < tenYearsMillis / 2) {
        lastRandom = yield* Random.nextIntBetween(0, tenYearsMillis)
      }
      assertTrue(lastRandom >= tenYearsMillis / 2)
    }))
  it.effect("shuffle", () =>
    Effect.gen(function*() {
      const start = Array.range(0, 100)
      const end = yield* Random.shuffle(start)
      assertTrue(Chunk.every(end, (n) => n !== undefined))
      deepStrictEqual(start.sort(), Array.fromIterable(end).sort())
    }).pipe(Effect.repeatN(100)))

  it.effect("make", () =>
    Effect.gen(function*() {
      const random0 = Random.make("foo")
      const random1 = Random.make("foo")
      const random2 = Random.make(Data.struct({ foo: "bar" }))
      const random3 = Random.make(Data.struct({ foo: "bar" }))
      const n0 = yield* random0.next
      const n1 = yield* random1.next
      const n2 = yield* random2.next
      const n3 = yield* random3.next
      strictEqual(n0, n1)
      strictEqual(n2, n3)
      assertTrue(n0 !== n2)
    }))

  it.live("choice", () =>
    Effect.gen(function*() {
      deepStrictEqual(
        yield* Random.choice([]).pipe(Effect.flip),
        new Cause.NoSuchElementException("Cannot select a random element from an empty array")
      )
      strictEqual(yield* Random.choice([1]), 1)

      const randomItems = yield* Random.choice([1, 2, 3]).pipe(Array.replicate(100), Effect.all)
      strictEqual(Array.intersection(randomItems, [1, 2, 3]).length, randomItems.length)

      assertTrue([1, 2, 3].includes(yield* Random.choice(Chunk.fromIterable([1, 2, 3]))))
    }))

  describe("fixed", () => {
    it.effect("cycles through numeric values", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.next, 0.2)
        strictEqual(yield* Random.next, 0.5)
        strictEqual(yield* Random.next, 0.8)
        strictEqual(yield* Random.next, 0.2)
        strictEqual(yield* Random.next, 0.5)
      }).pipe(Effect.withRandomFixed([0.2, 0.5, 0.8])))

    it.effect("cycles through boolean values", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.nextBoolean, true)
        strictEqual(yield* Random.nextBoolean, false)
        strictEqual(yield* Random.nextBoolean, true)
        strictEqual(yield* Random.nextBoolean, true)
      }).pipe(Effect.withRandom(Random.fixed([true, false, true]))))

    it.effect("cycles through integer values", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.nextInt, 10)
        strictEqual(yield* Random.nextInt, 20)
        strictEqual(yield* Random.nextInt, 30)
        strictEqual(yield* Random.nextInt, 10)
      }).pipe(Effect.withRandom(Random.fixed([10, 20, 30]))))

    it.effect("handles mixed value types", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.next, 0.5)
        strictEqual(yield* Random.nextBoolean, true)
        const next = yield* Random.next
        assertTrue(next >= 0 && next <= 1)
        strictEqual(yield* Random.nextInt, 4)
      }).pipe(Effect.withRandom(Random.fixed([0.5, true, "hello", 4.2]))))

    it.effect("nextRange works correctly", () =>
      Effect.gen(function*() {
        const value1 = yield* Random.nextRange(10, 20)
        const value2 = yield* Random.nextRange(10, 20)
        const value3 = yield* Random.nextRange(10, 20)
        strictEqual(value1, 12)
        strictEqual(value2, 15)
        strictEqual(value3, 18)
      }).pipe(Effect.withRandom(Random.fixed([0.2, 0.5, 0.8]))))

    it.effect("nextIntBetween works correctly", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.nextIntBetween(10, 20), 15)
        strictEqual(yield* Random.nextIntBetween(20, 30), 25)
        strictEqual(yield* Random.nextIntBetween(30, 40), 35)
        strictEqual(yield* Random.nextIntBetween(10, 20), 15)
      }).pipe(Effect.withRandom(Random.fixed([15, 25, 35]))))

    it.effect("clamps numeric values to valid range", () =>
      Effect.gen(function*() {
        strictEqual(yield* Random.next, 0)
        strictEqual(yield* Random.next, 1)
        strictEqual(yield* Random.next, 0.5)
      }).pipe(Effect.withRandom(Random.fixed([-1, 2, 0.5]))))

    it.effect("handles non-numeric values by hashing", () =>
      Effect.gen(function*() {
        const value1 = yield* Random.next
        const value2 = yield* Random.next
        const value3 = yield* Random.next
        assertTrue(value1 >= 0 && value1 <= 1)
        assertTrue(value2 >= 0 && value2 <= 1)
        assertTrue(value3 >= 0 && value3 <= 1)
        assertTrue(value1 !== value2)
        assertTrue(value2 !== value3)
      }).pipe(Effect.withRandom(Random.fixed(["a", "b", "c"]))))

    it.effect("shuffle works with array values", () =>
      Effect.gen(function*() {
        const shuffled = yield* Random.shuffle([1, 2, 3, 4, 5])
        deepStrictEqual(Array.fromIterable(shuffled).sort(), [1, 2, 3, 4, 5])
      }).pipe(Effect.withRandom(Random.fixed([1, 2, 3, 4, 5]))))
  })
})
