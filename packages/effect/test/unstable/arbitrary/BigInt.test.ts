import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const safeMaximum = BigInt(Number.MAX_SAFE_INTEGER)
const floatMaximum = BigInt(Number.MAX_VALUE)
const abs = (value: bigint) => value < 0n ? -value : value

const cases = [
  { name: "unbounded", schema: Schema.BigInt },
  { name: "positive", schema: Schema.BigInt.check(Schema.isGreaterThanBigInt(0n)) },
  { name: "negative", schema: Schema.BigInt.check(Schema.isLessThanBigInt(0n)) }
]

describe("BigInt arbitrary", () => {
  for (const { name, schema } of cases) {
    for (const size of [0, 1, 10]) {
      it.effect(`covers ordinary and extreme ${name} integers at size ${size}`, () =>
        Effect.gen(function*() {
          const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), {
            count: 2_000,
            size,
            seed: `bigint-diversity:${name}:${size}`,
            maxDiscards: 0
          })
          assert.isTrue(values.every(Schema.is(schema)))
          assert.isAtLeast(new Set(values).size, 1_000)
          const magnitudes = values.map(abs)
          assert.isAtLeast(magnitudes.filter((value) => value >= 1n && value <= 1_000_000n).length, values.length * 0.2)
          assert.isTrue(magnitudes.some((value) => value > 1_000_000n && value < safeMaximum))
          assert.isTrue(magnitudes.some((value) => value > safeMaximum))
          assert.isTrue(magnitudes.some((value) => value > floatMaximum))
          if (name === "unbounded") {
            for (const value of [-1n, 0n, 1n]) assert.include(values, value)
            assert.isAtLeast(values.filter((value) => value > 0n).length, values.length * 0.3)
            assert.isAtLeast(values.filter((value) => value < 0n).length, values.length * 0.3)
          }
        }))
    }
  }

  const distant = 10n ** 1_000n
  const bounds = [
    { name: "positive minimum", minimum: 123n },
    { name: "negative maximum", maximum: -123n },
    { name: "negative minimum", minimum: -123n },
    { name: "positive maximum", maximum: 123n },
    { name: "distant positive minimum", minimum: distant },
    { name: "distant negative maximum", maximum: -distant },
    { name: "distant negative minimum", minimum: -distant },
    { name: "distant positive maximum", maximum: distant }
  ] satisfies ReadonlyArray<{ readonly name: string; readonly minimum?: bigint; readonly maximum?: bigint }>

  for (const bound of bounds) {
    for (const exclusive of [false, true]) {
      it.effect(`constructs and shrinks ${exclusive ? "exclusive" : "inclusive"} ${bound.name}`, () =>
        Effect.gen(function*() {
          const schema = Schema.BigInt.check(
            "minimum" in bound
              ? exclusive
                ? Schema.isGreaterThanBigInt(bound.minimum)
                : Schema.isGreaterThanOrEqualToBigInt(bound.minimum)
              : exclusive
              ? Schema.isLessThanBigInt(bound.maximum)
              : Schema.isLessThanOrEqualToBigInt(bound.maximum)
          )
          const arbitrary = Arbitrary.schema(schema)
          const values = yield* Arbitrary.sampleEffect(arbitrary, {
            count: 2_000,
            seed: bound.name,
            size: 0,
            maxDiscards: 0
          })
          assert.isTrue(values.every(Schema.is(schema)))
          const boundary = "minimum" in bound ?
            bound.minimum + (exclusive ? 1n : 0n)
            : bound.maximum - (exclusive ? 1n : 0n)
          assert.include(values, boundary)
          const target = "minimum" in bound && boundary > 0n ?
            boundary
            : "maximum" in bound && boundary < 0n
            ? boundary
            : 0n
          const property = (value: bigint) => {
            assert.isTrue(Schema.is(schema)(value))
            return false
          }
          const result = yield* Arbitrary.checkEffect(arbitrary, property, {
            runs: 1,
            seed: bound.name,
            size: 0,
            maxDiscards: 0
          })
          assert.strictEqual(result._tag, "Falsified")
          if (result._tag === "Falsified") {
            assert.strictEqual(result.shrunkInput, target)
            const replay = yield* Arbitrary.checkEffect(arbitrary, property, { replay: result.replay })
            assert.deepStrictEqual(replay, result)
          }
        }))
    }
  }

  it.effect("shrinks large gaps relative to nonzero bounds within the default budget", () =>
    Effect.gen(function*() {
      for (const sign of [-1n, 1n]) {
        const origin = sign * distant
        const end = origin + sign * (1n << 2048n)
        const schema = Schema.BigInt.check(Schema.isBetweenBigInt({
          minimum: sign > 0n ? origin : end,
          maximum: sign > 0n ? end : origin
        }))
        const arbitrary = Arbitrary.schema(schema)
        const property = (value: bigint) => {
          assert.isTrue(Schema.is(schema)(value))
          return abs(value - origin) <= 1_000_003n
        }
        const result = yield* Arbitrary.checkEffect(arbitrary, property, {
          runs: 100,
          size: 0,
          seed: `bigint-offset:${sign}`
        })
        assert.strictEqual(result._tag, "Falsified")
        if (result._tag === "Falsified") {
          assert.isTrue(abs(result.initialInput - origin) > (1n << 64n))
          assert.strictEqual(result.shrunkInput, origin + sign * 1_000_004n)
          const replay = yield* Arbitrary.checkEffect(arbitrary, property, { replay: result.replay })
          assert.deepStrictEqual(replay, { ...result, runs: 1 })
        }
      }
    }))

  it.effect("shrinks large integers to a failure boundary and replays it", () =>
    Effect.gen(function*() {
      const arbitrary = Arbitrary.schema(Schema.BigInt)
      for (const sign of [-1n, 1n]) {
        const limit = sign * safeMaximum
        const property = (value: bigint) => sign > 0n ? value <= limit : value >= limit
        const result = yield* Arbitrary.checkEffect(arbitrary, property, {
          runs: 100,
          size: 1,
          seed: `bigint-failure-boundary:${sign}`
        })
        assert.strictEqual(result._tag, "Falsified")
        if (result._tag === "Falsified") {
          assert.strictEqual(result.shrunkInput, limit + sign)
          const replay = yield* Arbitrary.checkEffect(arbitrary, property, {
            replay: result.replay
          })
          // Replay runs only the failing case, not the preceding successful cases.
          assert.deepStrictEqual(replay, { ...result, runs: 1 })
        }
      }
    }))
})
