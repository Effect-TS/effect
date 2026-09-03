import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"

describe("Random", () => {
  describe("next", () => {
    it.effect("generates a number between 0 inclusive and 1 exclusive", () =>
      Effect.gen(function*() {
        const value = yield* Random.next

        assert.isAtLeast(value, 0)
        assert.isBelow(value, 1)
      }))
  })

  describe("nextBoolean", () => {
    it.effect("generates a boolean", () =>
      Effect.gen(function*() {
        const value = yield* Random.nextBoolean

        assert.isTrue(value === true || value === false)
      }))

    it.effect("is deterministic with the same seed", () =>
      Effect.gen(function*() {
        const program = Effect.all([Random.nextBoolean, Random.nextBoolean, Random.nextBoolean])

        const result1 = yield* program.pipe(Random.withSeed("next-boolean-seed"))
        const result2 = yield* program.pipe(Random.withSeed("next-boolean-seed"))

        assert.deepStrictEqual(result1, result2)
      }))

    it.effect("uses a strict greater-than threshold", () =>
      Effect.gen(function*() {
        const values = [0.5, 0.500001, 0.1]
        let index = 0

        const result = yield* Effect.all([Random.nextBoolean, Random.nextBoolean, Random.nextBoolean]).pipe(
          Effect.provideService(Random.Random, {
            nextIntUnsafe: () => 0,
            nextDoubleUnsafe: () => values[index++] ?? 0
          })
        )

        assert.deepStrictEqual(result, [false, true, false])
      }))
  })

  describe("nextInt", () => {
    it.effect("generates a safe integer", () =>
      Effect.gen(function*() {
        const value = yield* Random.nextInt

        assert.isTrue(Number.isSafeInteger(value))
        assert.isAtLeast(value, Number.MIN_SAFE_INTEGER)
        assert.isAtMost(value, Number.MAX_SAFE_INTEGER)
      }))
  })

  describe("nextBetween", () => {
    it.effect.each(
      [
        ["unit high control", 0, 1, 1 - Number.EPSILON, 1 - Number.EPSILON],
        ["ordinary interior control", 10, 20, 0.75, 17.5],
        ["inclusive lower control", 10, 20, 0, 10],
        ["negative interior control", -20, -10, 0.75, -12.5],
        ["cross-zero interior control", -10, 10, 0.75, 5],
        ["positive zero lower control", 0, 1, 0, 0],
        ["negative zero lower control", -0, 1, 0, 0],
        ["ordinary upper rounding", 10, 20, 1 - Number.EPSILON, 20 - 2 ** -48],
        ["adjacent positive integers", 1e16, 1e16 + 2, 0.75, 1e16],
        ["adjacent negative integers", -1e16 - 2, -1e16, 0.75, -1e16 - 2],
        ["positive unit endpoint", 1 - 2 ** -53, 1, 0.75, 1 - 2 ** -53],
        ["positive power-of-two endpoint", 2 - 2 ** -52, 2, 0.75, 2 - 2 ** -52],
        ["negative unit endpoint", -1 - 2 ** -52, -1, 0.75, -1 - 2 ** -52],
        ["negative power-of-two endpoint", -2 - 2 ** -51, -2, 0.75, -2 - 2 ** -51],
        ["positive zero upper", -Number.MIN_VALUE, 0, 0.75, -Number.MIN_VALUE],
        ["negative zero upper", -Number.MIN_VALUE, -0, 0.75, -Number.MIN_VALUE],
        ["smallest positive upper", 0, Number.MIN_VALUE, 0.75, 0],
        ["smallest positive upper from negative zero", -0, Number.MIN_VALUE, 0.75, 0],
        ["cross-zero subnormal", -Number.MIN_VALUE, Number.MIN_VALUE, 0.75, 0],
        ["positive subnormal", Number.MIN_VALUE, 2 * Number.MIN_VALUE, 0.75, Number.MIN_VALUE],
        ["negative subnormal", -2 * Number.MIN_VALUE, -Number.MIN_VALUE, 0.75, -2 * Number.MIN_VALUE],
        ["smallest positive normal", 2 ** -1022 - Number.MIN_VALUE, 2 ** -1022, 0.75, 2 ** -1022 - Number.MIN_VALUE],
        ["negative normal-subnormal boundary", -(2 ** -1022), -(2 ** -1022) + Number.MIN_VALUE, 0.75, -(2 ** -1022)],
        ["largest finite upper", Number.MAX_VALUE - 2 ** 971, Number.MAX_VALUE, 0.75, Number.MAX_VALUE - 2 ** 971],
        ["smallest finite lower", -Number.MAX_VALUE, -Number.MAX_VALUE + 2 ** 971, 0.75, -Number.MAX_VALUE]
      ] as const
    )("excludes the upper endpoint with one draw: %s", ([_name, min, max, draw, expected]) =>
      Effect.gen(function*() {
        assert.isTrue(Number.isFinite(min) && Number.isFinite(max) && Number.isFinite(max - min))
        assert.isBelow(min, max)
        assert.isAtLeast(draw, 0)
        assert.isBelow(draw, 1)
        let doubleCalls = 0
        let intCalls = 0
        const value = yield* Random.nextBetween(min, max).pipe(
          Effect.provideService(Random.Random, {
            nextIntUnsafe: () => {
              intCalls++
              return 0
            },
            nextDoubleUnsafe: () => {
              doubleCalls++
              return draw
            }
          })
        )
        assert.strictEqual(doubleCalls, 1)
        assert.strictEqual(intCalls, 0)
        assert.isAtLeast(value, min)
        assert.isBelow(value, max)
        assert.isTrue(Object.is(value, expected))
      }))

    it.effect("does not retry a constant provider", () =>
      Effect.gen(function*() {
        let calls = 0
        const values = yield* Effect.all([
          Random.nextBetween(10, 20),
          Random.nextBetween(10, 20),
          Random.nextBetween(10, 20)
        ]).pipe(Effect.provideService(Random.Random, {
          nextIntUnsafe: () => 0,
          nextDoubleUnsafe: () => {
            calls++
            return 1 - Number.EPSILON
          }
        }))
        assert.strictEqual(calls, 3)
        assert.deepStrictEqual(values, [20 - 2 ** -48, 20 - 2 ** -48, 20 - 2 ** -48])
      }))

    it.effect("preserves the in-range seeded formula and following draw", () =>
      Effect.gen(function*() {
        const bounds = [[0, 1], [10, 20], [-20, -10], [-10, 10], [10.5, 20.5]] as const
        const draws = yield* Effect.all(bounds.map(() => Random.next)).pipe(Random.withSeed("next-between-formula"))
        const expected = bounds.map(([min, max], i) => draws[i] * (max - min) + min)
        for (let i = 0; i < bounds.length; i++) {
          assert.isAtLeast(expected[i], bounds[i][0])
          assert.isBelow(expected[i], bounds[i][1])
        }
        const actual = yield* Effect.all(bounds.map(([min, max]) => Random.nextBetween(min, max))).pipe(
          Random.withSeed("next-between-formula")
        )
        assert.deepStrictEqual(actual, expected)

        const withBounded = yield* Effect.all([Random.nextBetween(10, 20), Random.next]).pipe(
          Random.withSeed("next-between-formula")
        )
        const raw = yield* Effect.all([Random.next, Random.next]).pipe(Random.withSeed("next-between-formula"))
        assert.deepStrictEqual(withBounded, [raw[0] * 10 + 10, raw[1]])
      }))

    it.effect("leaves degenerate and unsupported bounds on the existing formula", () =>
      Effect.gen(function*() {
        // Compatibility guards only: these cases do not establish a new bounds policy.
        const bounds = [
          [10, 10],
          [0, -0],
          [-0, 0],
          [20, 10],
          [NaN, 20],
          [10, NaN],
          [10, Infinity],
          [-Infinity, 20],
          [-Infinity, Infinity],
          [-Number.MAX_VALUE, Number.MAX_VALUE]
        ] as const
        for (const [min, max] of bounds) {
          for (const draw of [0, 0.75, 1 - Number.EPSILON]) {
            let calls = 0
            const value = yield* Random.nextBetween(min, max).pipe(
              Effect.provideService(Random.Random, {
                nextIntUnsafe: () => 0,
                nextDoubleUnsafe: () => {
                  calls++
                  return draw
                }
              })
            )
            assert.strictEqual(calls, 1)
            assert.isTrue(Object.is(value, draw * (max - min) + min))
          }
        }
      }))

    it.effect("generates number in half-open range", () =>
      Effect.gen(function*() {
        for (let i = 0; i < 100; i++) {
          const value = yield* Random.nextBetween(10, 20)
          assert.isAtLeast(value, 10)
          assert.isBelow(value, 20)
        }
      }))

    it.effect("does not round the bounds", () =>
      Effect.gen(function*() {
        const value = yield* Random.nextBetween(10.5, 20.5).pipe(
          Effect.provideService(Random.Random, {
            nextIntUnsafe: () => 0,
            nextDoubleUnsafe: () => 0.75
          })
        )

        assert.strictEqual(value, 18)
      }))

    it.effect("handles negative ranges", () =>
      Effect.gen(function*() {
        const value = yield* Random.nextBetween(-10, 10)

        assert.isAtLeast(value, -10)
        assert.isBelow(value, 10)
      }))
  })

  describe("nextIntBetween", () => {
    it.effect("generates integer in closed range", () =>
      Effect.gen(function*() {
        for (let i = 0; i < 100; i++) {
          const value = yield* Random.nextIntBetween(1, 6)
          assert.isTrue(Number.isInteger(value))
          assert.isAtLeast(value, 1)
          assert.isAtMost(value, 6)
        }
      }))

    it.effect("generates integer in half-open range", () =>
      Effect.gen(function*() {
        for (let i = 0; i < 100; i++) {
          const value = yield* Random.nextIntBetween(1, 6, {
            halfOpen: true
          })
          assert.isTrue(Number.isInteger(value))
          assert.isAtLeast(value, 1)
          assert.isBelow(value, 6)
        }
      }))

    it.effect("excludes the upper bound in half-open ranges", () =>
      Effect.gen(function*() {
        const value = yield* Random.nextIntBetween(1, 6, { halfOpen: true }).pipe(
          Effect.provideService(Random.Random, {
            nextIntUnsafe: () => 0,
            nextDoubleUnsafe: () => 1 - Number.EPSILON
          })
        )

        assert.strictEqual(value, 5)
      }))
  })

  describe("shuffle", () => {
    it.effect("returns a shuffled copy of all values", () =>
      Effect.gen(function*() {
        const input = [1, 2, 3, 4, 5]
        const output = yield* Random.shuffle(input)

        assert.notStrictEqual(output, input)
        assert.deepStrictEqual(input, [1, 2, 3, 4, 5])
        assert.deepStrictEqual(Array.from(output).sort((a, b) => a - b), [1, 2, 3, 4, 5])
      }))

    it.effect("is deterministic with the same seed", () =>
      Effect.gen(function*() {
        const program = Random.shuffle([1, 2, 3, 4, 5])

        const result1 = yield* program.pipe(Random.withSeed("shuffle-seed"))
        const result2 = yield* program.pipe(Random.withSeed("shuffle-seed"))

        assert.deepStrictEqual(result1, result2)
      }))
  })

  describe("choice", () => {
    it.effect("selects a random element from an iterable", () =>
      Effect.gen(function*() {
        const value = yield* Random.choice(["a", "b", "c"]).pipe(
          Effect.provideService(Random.Random, {
            nextIntUnsafe: () => 0,
            nextDoubleUnsafe: () => 0.75
          })
        )

        assert.strictEqual(value, "c")
      }))

    it.effect("fails with NoSuchElementError for an empty iterable", () =>
      Effect.gen(function*() {
        const error = yield* Random.choice([]).pipe(Effect.flip)

        assert.isTrue(Cause.isNoSuchElementError(error))
        assert.strictEqual(error.message, "Cannot select a random element from an empty array")
      }))

    it.effect("is deterministic with the same seed", () =>
      Effect.gen(function*() {
        const program = Effect.all([
          Random.choice([1, 2, 3, 4, 5]),
          Random.choice([1, 2, 3, 4, 5]),
          Random.choice([1, 2, 3, 4, 5])
        ])

        const result1 = yield* program.pipe(Random.withSeed("choice-seed"))
        const result2 = yield* program.pipe(Random.withSeed("choice-seed"))

        assert.deepStrictEqual(result1, result2)
      }))
  })

  describe("withSeed", () => {
    it.effect("produces deterministic sequence with same seed", () =>
      Effect.gen(function*() {
        const program = Effect.gen(function*() {
          const v1 = yield* Random.next
          const v2 = yield* Random.nextInt
          return [v1, v2]
        })

        const result1 = yield* program.pipe(Random.withSeed("test-seed"))
        const result2 = yield* program.pipe(Random.withSeed("test-seed"))

        assert.deepStrictEqual(result1, result2)
      }))

    it.effect("produces different sequences with different seeds", () =>
      Effect.gen(function*() {
        const program = Effect.gen(function*() {
          const v1 = yield* Random.next
          const v2 = yield* Random.nextInt
          return [v1, v2]
        })

        const result1 = yield* program.pipe(Random.withSeed(12345))
        const result2 = yield* program.pipe(Random.withSeed(67890))

        assert.notDeepEqual(result1, result2)
      }))

    it.effect("distinguishes one-character string seeds", () =>
      Effect.gen(function*() {
        const program = Effect.all([Random.next, Random.next, Random.next, Random.next, Random.next])

        const empty = yield* program.pipe(Random.withSeed(""))
        const result1 = yield* program.pipe(Random.withSeed("a"))
        const result2 = yield* program.pipe(Random.withSeed("b"))

        assert.notDeepEqual(result1, empty)
        assert.notDeepEqual(result2, empty)
        assert.notDeepEqual(result1, result2)
      }))

    it.effect("distinguishes trailing partial UTF-8 words in string seeds", () =>
      Effect.gen(function*() {
        const program = Effect.all([Random.next, Random.next, Random.next, Random.next, Random.next])
        const pairs = [
          ["1234a", "1234b"],
          ["1234ab", "1234ac"],
          ["1234abc", "1234abd"]
        ] as const

        for (const [seed1, seed2] of pairs) {
          const result1 = yield* program.pipe(Random.withSeed(seed1))
          const result2 = yield* program.pipe(Random.withSeed(seed2))

          assert.notDeepEqual(result1, result2)
        }
      }))

    it.effect("distinguishes astral character string seeds", () =>
      Effect.gen(function*() {
        const program = Effect.all([Random.next, Random.next, Random.next, Random.next, Random.next])

        const empty = yield* program.pipe(Random.withSeed(""))
        const result1 = yield* program.pipe(Random.withSeed("😀"))
        const result2 = yield* program.pipe(Random.withSeed("😁"))
        const result3 = yield* program.pipe(Random.withSeed("🐀"))

        assert.notDeepEqual(result1, empty)
        assert.notDeepEqual(result2, empty)
        assert.notDeepEqual(result1, result2)
        assert.notDeepEqual(result1, result3)
      }))

    it.effect("works with numeric seeds", () =>
      Effect.gen(function*() {
        const program = Effect.gen(function*() {
          const v1 = yield* Random.next
          const v2 = yield* Random.nextInt
          return [v1, v2]
        })

        const result1 = yield* program.pipe(Random.withSeed(12345))
        const result2 = yield* program.pipe(Random.withSeed(12345))

        assert.deepStrictEqual(result1, result2)
      }))
  })
})
