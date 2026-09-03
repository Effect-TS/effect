import { assert, describe, it } from "@effect/vitest"
import { Effect, Result, Schema } from "effect"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const options = { count: 1, size: 0, maxDiscards: 0, seed: 0 }
const schema = Schema.StructWithRest(Schema.Struct({ value: Schema.String }), [
  Schema.Record(Schema.String, Schema.NonEmptyString)
])

describe("R3 StructWithRest verification", () => {
  it.effect("matches the existing exhaustion contract for an inhabited residual filter", () =>
    Effect.gen(function*() {
      const control = Schema.String.check(Schema.makeFilter((value) => value.length > 0))
      assert.isTrue(Schema.is(control)("x"))
      const result = yield* Effect.result(Arbitrary.sampleEffect(Arbitrary.schema(control), options))
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.deepStrictEqual(result.failure, { _tag: "SampleError", generated: 0, discards: 1, seed: 0 })
      }
    }))
  it("has an inhabited intersection, not an unsupported schema", () => {
    assert.isFalse(Schema.is(schema)({ value: "" }))
    assert.isTrue(Schema.is(schema)({ value: "x" }))
  })

  it.effect("never emits the invalid empty fixed value at size zero", () =>
    Effect.gen(function*() {
      const result = yield* Effect.result(Arbitrary.sampleEffect(Arbitrary.schema(schema), options))
      if (Result.isSuccess(result)) {
        assert.lengthOf(result.success, 1)
        assert.isTrue(result.success.every(Schema.is(schema)), JSON.stringify(result.success))
      } else {
        assert.deepStrictEqual(result.failure, { _tag: "SampleError", generated: 0, discards: 1, seed: 0 })
      }
    }))

  it.effect("reports the exact bounded size-zero exhaustion, including progressive checking", () =>
    Effect.gen(function*() {
      const result = yield* Effect.result(
        Arbitrary.sampleEffect(Arbitrary.schema(schema), { ...options, maxDiscards: 2 })
      )
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.deepStrictEqual(result.failure, { _tag: "SampleError", generated: 0, discards: 3, seed: 0 })
      }
      const checked = yield* Arbitrary.checkEffect(Arbitrary.schema(schema), Schema.is(schema), {
        runs: 10,
        size: 8,
        seed: 0,
        maxDiscards: 2
      })
      assert.deepStrictEqual(checked, { _tag: "Exhausted", runs: 0, discards: 3, seed: 0 })
    }))

  it.effect("keeps an explicit fixed-field minimum productive at size zero", () =>
    Effect.gen(function*() {
      const control = Schema.StructWithRest(Schema.Struct({ value: Schema.NonEmptyString }), [
        Schema.Record(Schema.String, Schema.NonEmptyString)
      ])
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(control), options)
      assert.lengthOf(values, 1)
      assert.isTrue(values.every(Schema.is(control)))
    }))

  it.effect("is productively valid at bounded nonzero sizes", () =>
    Effect.gen(function*() {
      for (const size of [1, 4, 8]) {
        const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), {
          ...options,
          size,
          count: 16,
          maxDiscards: 128
        })
        assert.lengthOf(values, 16)
        assert.isTrue(values.every(Schema.is(schema)))
      }
    }))

  it.effect("applies only matching key patterns", () =>
    Effect.gen(function*() {
      const key = Schema.String.check(Schema.isPattern(/^x/))
      const matching = Schema.StructWithRest(Schema.Struct({ x: Schema.String }), [
        Schema.Record(key, Schema.NonEmptyString)
      ])
      const unmatched = Schema.StructWithRest(Schema.Struct({ value: Schema.String }), [
        Schema.Record(key, Schema.NonEmptyString)
      ])
      assert.isFalse(Schema.is(matching)({ x: "" }))
      assert.isTrue(Schema.is(unmatched)({ value: "" }))
      const result = yield* Effect.result(Arbitrary.sampleEffect(Arbitrary.schema(matching), options))
      assert.isTrue(Result.isFailure(result))
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(unmatched), options)
      assert.lengthOf(values, 1)
      assert.isTrue(values.every(Schema.is(unmatched)))
    }))

  it.effect("retains all overlapping string indexes", () =>
    Effect.gen(function*() {
      const overlap = Schema.StructWithRest(Schema.Struct({ x: Schema.String }), [
        Schema.Record(Schema.String, Schema.String),
        Schema.Record(Schema.String.check(Schema.isPattern(/^x/)), Schema.NonEmptyString)
      ])
      assert.isFalse(Schema.is(overlap)({ x: "" }))
      assert.isTrue(Schema.is(overlap)({ x: "x" }))
      const result = yield* Effect.result(Arbitrary.sampleEffect(Arbitrary.schema(overlap), options))
      assert.isTrue(Result.isFailure(result))
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(overlap), {
        ...options,
        size: 4,
        count: 16,
        maxDiscards: 128
      })
      assert.lengthOf(values, 16)
      assert.isTrue(values.every(Schema.is(overlap)))
      const indexOnly = Schema.StructWithRest(Schema.Struct({}), [
        Schema.Record(Schema.String, Schema.String),
        Schema.Record(Schema.String, Schema.NonEmptyString)
      ]).check(Schema.isMinProperties(1))
      const indexedValues = yield* Arbitrary.sampleEffect(Arbitrary.schema(indexOnly), {
        ...options,
        size: 1,
        count: 16,
        maxDiscards: 128
      })
      assert.lengthOf(indexedValues, 16)
      assert.isTrue(indexedValues.every(Schema.is(indexOnly)))
    }))

  it.effect("validates fixed symbol keys and ignores unmatched string keys", () =>
    Effect.gen(function*() {
      const key = Symbol.for("r3")
      const invalid = Schema.StructWithRest(Schema.Struct({ [key]: Schema.String }), [
        Schema.Record(Schema.Symbol, Schema.NonEmptyString)
      ])
      const control = Schema.StructWithRest(Schema.Struct({ [key]: Schema.NonEmptyString, value: Schema.String }), [
        Schema.Record(Schema.Symbol, Schema.NonEmptyString)
      ])
      assert.isFalse(Schema.is(invalid)({ [key]: "" }))
      assert.isTrue(Schema.is(control)({ [key]: "x", value: "" }))
      const result = yield* Effect.result(Arbitrary.sampleEffect(Arbitrary.schema(invalid), options))
      assert.isTrue(Result.isFailure(result))
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(control), options)
      assert.lengthOf(values, 1)
      assert.isTrue(values.every(Schema.is(control)))
    }))

  it.effect("retains optional fields and all automatic shrink candidates are valid", () =>
    Effect.gen(function*() {
      const optional = Schema.StructWithRest(
        Schema.Struct({ value: Schema.String, extra: Schema.optionalKey(Schema.String) }),
        [Schema.Record(Schema.String, Schema.NonEmptyString)]
      )
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(optional), {
        ...options,
        size: 4,
        count: 32,
        maxDiscards: 128
      })
      assert.lengthOf(values, 32)
      assert.isTrue(values.every(Schema.is(optional)))
      assert.isTrue(values.some((value) => Object.hasOwn(value, "extra")))
      assert.isTrue(values.some((value) => !Object.hasOwn(value, "extra")))
      const seen: Array<typeof optional.Type> = []
      const result = yield* Arbitrary.checkEffect(Arbitrary.schema(optional), (value) => {
        seen.push(value)
        return false
      }, {
        runs: 1,
        size: 4,
        seed: 0,
        maxDiscards: 128,
        maxShrinks: 64
      })
      assert.strictEqual(result._tag, "Falsified")
      assert.isAbove(seen.length, 1)
      assert.isTrue(seen.every(Schema.is(optional)))
      if (result._tag === "Falsified") assert.isTrue(Schema.is(optional)(result.shrunkInput))
    }))

  it.effect("returns original generated nested identities, with one outer check", () =>
    Effect.gen(function*() {
      const references: Array<object> = []
      let outer = 0
      const field = Schema.Struct({ text: Schema.NonEmptyString }).check(Schema.makeFilter((value) => {
        references.push(value)
        return true
      }))
      const identity = Schema.StructWithRest(Schema.Struct({ value: field }), [Schema.Record(Schema.String, field)])
        .check(
          Schema.makeFilter(() => {
            outer++
            return true
          })
        )
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(identity), options)
      assert.strictEqual(values[0].value, references[0])
      assert.strictEqual(references.length, 3)
      assert.strictEqual(outer, 1)
    }))

  it.effect("preserves ordinary/null prototypes, special keys, shrinking and replay", () =>
    Effect.gen(function*() {
      const control = Schema.StructWithRest(Schema.Struct({ value: Schema.NonEmptyString }), [
        Schema.Record(Schema.String, Schema.NonEmptyString)
      ])
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(control), { ...options, count: 512 })
      assert.isTrue(values.every(Schema.is(control)))
      assert.isTrue(values.some((value) => Object.getPrototypeOf(value) === null))
      assert.isTrue(values.some((value) => Object.getPrototypeOf(value) === Object.prototype))
      const arbitrary = Arbitrary.schema(control)
      const property = (value: typeof control.Type) => Object.getPrototypeOf(value) !== null
      const result = yield* Arbitrary.checkEffect(arbitrary, property, {
        runs: 100,
        size: 4,
        seed: "null-prototype-shrink",
        maxDiscards: 200,
        maxShrinks: 64
      })
      assert.strictEqual(result._tag, "Falsified")
      if (result._tag === "Falsified") {
        assert.strictEqual(Object.getPrototypeOf(result.initialInput), null)
        assert.strictEqual(Object.getPrototypeOf(result.shrunkInput), null)
        assert.isTrue(Schema.is(control)(result.shrunkInput))
        const replay = yield* Arbitrary.checkEffect(arbitrary, property, { replay: result.replay })
        assert.strictEqual(replay._tag, "Falsified")
        if (replay._tag === "Falsified") {
          assert.deepStrictEqual(replay.initialInput, result.initialInput)
          assert.deepStrictEqual(replay.shrunkInput, result.shrunkInput)
          assert.deepStrictEqual(replay.failure, result.failure)
          assert.strictEqual(replay.shrinks, result.shrinks)
          assert.strictEqual(replay.replay, result.replay)
          assert.strictEqual(Object.getPrototypeOf(replay.shrunkInput), null)
        }
      }
      const special = Schema.Record(Schema.Literal("__proto__"), Schema.NonEmptyString)
      const specialValues = yield* Arbitrary.sampleEffect(Arbitrary.schema(special), { ...options, count: 16 })
      assert.isTrue(specialValues.every((value) => Object.hasOwn(value, "__proto__") && Schema.is(special)(value)))
    }))
})
