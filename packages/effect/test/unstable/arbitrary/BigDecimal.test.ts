import { assert, describe, it } from "@effect/vitest"
import * as BigDecimal from "effect/BigDecimal"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const decimal = BigDecimal.fromStringUnsafe
const zero = decimal("0")
const one = decimal("1")
const humanMaximum = decimal("1000000")
const safeMaximum = BigDecimal.fromBigInt(BigInt(Number.MAX_SAFE_INTEGER))
const floatMaximum = BigDecimal.fromBigInt(BigInt(Number.MAX_VALUE))
const tiny = BigDecimal.make(1n, 324)

const cases = [
  { name: "unbounded", schema: Schema.BigDecimal },
  { name: "positive", schema: Schema.BigDecimal.check(Schema.isGreaterThanBigDecimal(zero)) },
  { name: "negative", schema: Schema.BigDecimal.check(Schema.isLessThanBigDecimal(zero)) }
]

describe("BigDecimal arbitrary", () => {
  for (const { name, schema } of cases) {
    for (const size of [0, 1, 10]) {
      it.effect(`covers ordinary and extreme ${name} decimals at size ${size}`, () =>
        Effect.gen(function*() {
          const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), {
            count: 2_000,
            size,
            seed: `decimal-diversity:${name}:${size}`,
            maxDiscards: 0
          })
          assert.isTrue(values.every(Schema.is(schema)))
          assert.isAtLeast(new Set(values.map(BigDecimal.format)).size, 1_000)
          const magnitudes = values.map(BigDecimal.abs)
          const human = magnitudes.filter((value) =>
            BigDecimal.isGreaterThanOrEqualTo(value, one) && BigDecimal.isLessThanOrEqualTo(value, humanMaximum)
          )
          assert.isAtLeast(human.length, values.length * 0.1)
          assert.isTrue(magnitudes.some((value) => BigDecimal.isGreaterThan(value, safeMaximum)))
          assert.isTrue(magnitudes.some((value) => BigDecimal.isGreaterThan(value, floatMaximum)))
          assert.isTrue(magnitudes.some((value) => !BigDecimal.isZero(value) && BigDecimal.isLessThan(value, tiny)))
          if (name === "unbounded") {
            assert.isTrue(values.some(BigDecimal.isZero))
            for (const sign of [BigDecimal.isPositive, BigDecimal.isNegative]) {
              assert.isAtLeast(values.filter(sign).length, values.length * 0.3)
            }
          }
        }))
    }
  }

  const bounds = [
    { name: "positive fractional minimum", minimum: decimal("1.234"), exclusiveMinimum: true },
    { name: "negative fractional maximum", maximum: decimal("-1.234"), exclusiveMaximum: true },
    { name: "negative minimum", minimum: decimal("-1.234") },
    { name: "positive maximum", maximum: decimal("1.234") },
    { name: "positive narrow interval", minimum: decimal("1.234"), maximum: decimal("1.236") },
    { name: "negative narrow interval", minimum: decimal("-1.236"), maximum: decimal("-1.234") },
    { name: "exclusive coarse endpoints", minimum: zero, maximum: one, exclusiveMinimum: true, exclusiveMaximum: true },
    {
      name: "exclusive fractional endpoints",
      minimum: decimal("1.234"),
      maximum: decimal("1.236"),
      exclusiveMinimum: true,
      exclusiveMaximum: true
    },
    {
      name: "exclusive negative endpoints",
      minimum: decimal("-1.236"),
      maximum: decimal("-1.234"),
      exclusiveMinimum: true,
      exclusiveMaximum: true
    },
    { name: "different scales", minimum: BigDecimal.make(-12345n, 22), maximum: BigDecimal.make(678901n, 24) },
    { name: "singleton", minimum: decimal("1.234"), maximum: decimal("1.234") },
    {
      name: "very small interval",
      minimum: BigDecimal.make(1n, 1_000),
      maximum: BigDecimal.make(2n, 1_000),
      exclusiveMinimum: true,
      exclusiveMaximum: true
    },
    {
      name: "very large interval",
      minimum: BigDecimal.make(1n, -1_000),
      maximum: BigDecimal.make(2n, -1_000),
      exclusiveMinimum: true,
      exclusiveMaximum: true
    },
    { name: "very small maximum", maximum: BigDecimal.make(-1n, 1_000), exclusiveMaximum: true },
    { name: "very large minimum", minimum: BigDecimal.make(1n, -1_000), exclusiveMinimum: true }
  ] satisfies ReadonlyArray<
    Schema.Annotations.ToArbitrary.GenerationConstraint<BigDecimal.BigDecimal> & { readonly name: string }
  >

  for (const bound of bounds) {
    it.effect(`constructs and shrinks ${bound.name} without discards`, () =>
      Effect.gen(function*() {
        const constraint: Schema.Annotations.ToArbitrary.GenerationConstraint<BigDecimal.BigDecimal> = bound
        let schema: Schema.Codec<BigDecimal.BigDecimal> = Schema.BigDecimal
        if (constraint.minimum !== undefined) {
          schema = schema.check(
            constraint.exclusiveMinimum
              ? Schema.isGreaterThanBigDecimal(constraint.minimum)
              : Schema.isGreaterThanOrEqualToBigDecimal(constraint.minimum)
          )
        }
        if (constraint.maximum !== undefined) {
          schema = schema.check(
            constraint.exclusiveMaximum
              ? Schema.isLessThanBigDecimal(constraint.maximum)
              : Schema.isLessThanOrEqualToBigDecimal(constraint.maximum)
          )
        }
        const arbitrary = Arbitrary.schema(schema)
        const values = yield* Arbitrary.sampleEffect(arbitrary, {
          count: 500,
          seed: bound.name,
          size: 1,
          maxDiscards: 0
        })
        assert.isTrue(values.every(Schema.is(schema)))
        const property = (value: BigDecimal.BigDecimal) => {
          assert.isTrue(Schema.is(schema)(value))
          return false
        }
        const result = yield* Arbitrary.checkEffect(arbitrary, property, {
          runs: 1,
          seed: bound.name,
          size: 1,
          maxDiscards: 0
        })
        assert.strictEqual(result._tag, "Falsified")
        if (result._tag === "Falsified") {
          assert.isTrue(Schema.is(schema)(result.shrunkInput))
          const replay = yield* Arbitrary.checkEffect(arbitrary, property, { replay: result.replay })
          assert.deepStrictEqual(replay, result)
        }
      }))
  }

  for (const boundary of [decimal("1.234"), decimal("-1.234")]) {
    it.effect(`shrinks coarse scales to the exact inclusive boundary ${BigDecimal.format(boundary)}`, () =>
      Effect.gen(function*() {
        const schema = Schema.BigDecimal.check(
          BigDecimal.isPositive(boundary)
            ? Schema.isGreaterThanOrEqualToBigDecimal(boundary)
            : Schema.isLessThanOrEqualToBigDecimal(boundary)
        )
        for (const seed of [0, 9, 18, 42]) {
          const result = yield* Arbitrary.checkEffect(Arbitrary.schema(schema), () => false, { runs: 1, size: 1, seed })
          assert.strictEqual(result._tag, "Falsified")
          if (result._tag === "Falsified") {
            assert.isTrue(BigDecimal.Equivalence(result.shrunkInput, boundary))
          }
        }
      }))
  }

  it.effect("shrinks unconstrained decimals to zero and replays the failure", () =>
    Effect.gen(function*() {
      const arbitrary = Arbitrary.schema(Schema.BigDecimal)
      const result = yield* Arbitrary.checkEffect(arbitrary, () => false, { runs: 1, size: 1, seed: "decimal-zero" })
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag === "Falsified") {
        assert.isTrue(BigDecimal.isZero(result.shrunkInput))
        const replay = yield* Arbitrary.checkEffect(arbitrary, () => false, { replay: result.replay })
        assert.deepStrictEqual(replay, result)
      }
    }))
})
