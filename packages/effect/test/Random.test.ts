import { Array, Cause, Chunk, Data, Effect, Random } from "effect"
import { expect, it } from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("Random", () => {
  it.effect("integer is correctly distributed", () =>
    Effect.gen(function*() {
      const tenYearsMillis = 10 * 365 * 24 * 60 * 60 * 1000
      let lastRandom = 0
      while (lastRandom < tenYearsMillis / 2) {
        lastRandom = yield* Random.nextIntBetween(0, tenYearsMillis)
      }
      assert.isTrue(lastRandom >= tenYearsMillis / 2)
    }))
  it.effect("shuffle", () =>
    Effect.gen(function*() {
      const start = Array.range(0, 100)
      const end = yield* Random.shuffle(start)
      assert.isTrue(Chunk.every(end, (n) => n !== undefined))
      assert.deepStrictEqual(start.sort(), Array.fromIterable(end).sort())
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
      assert.strictEqual(n0, n1)
      assert.strictEqual(n2, n3)
      assert.notStrictEqual(n0, n2)
    }))

  it.live("choice", () =>
    Effect.gen(function*() {
      expect(yield* Random.choice([]).pipe(Effect.flip)).toEqual(new Cause.NoSuchElementException())
      expect(yield* Random.choice([1])).toEqual(1)

      const randomItems = yield* Random.choice([1, 2, 3]).pipe(Array.replicate(100), Effect.all)
      expect(Array.intersection(randomItems, [1, 2, 3]).length).toEqual(randomItems.length)

      expect(yield* Random.choice(Chunk.fromIterable([1, 2, 3]))).oneOf([1, 2, 3])
    }))
})
