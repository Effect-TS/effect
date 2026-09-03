import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Result, Schema, SchemaIssue, SchemaTransformation } from "effect"
import * as Scheduler from "effect/Scheduler"
import * as Arbitrary from "effect/unstable/arbitrary/Arbitrary"

const options = { count: 1, size: 0, maxDiscards: 0, seed: 0 }

describe("R3 template verification", () => {
  it.effect("emits encoded bits, not decoded boolean words", () =>
    Effect.gen(function*() {
      const schema = Schema.TemplateLiteral([Schema.BooleanFromBit])
      assert.isTrue(Schema.is(schema)("0"))
      assert.isTrue(Schema.is(schema)("1"))
      assert.isFalse(Schema.is(schema)("false"))
      assert.isFalse(Schema.is(schema)("true"))
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), options)
      assert.lengthOf(values, 1)
      assert.isTrue(values.every(Schema.is(schema)), JSON.stringify(values))
    }))

  it.effect("keeps plain bit literals productive", () =>
    Effect.gen(function*() {
      const schema = Schema.TemplateLiteral([Schema.Literals([0, 1])])
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), options)
      assert.lengthOf(values, 1)
      assert.isTrue(values.every(Schema.is(schema)))
    }))

  it.effect("preserves plain, finite numeric, bigint, union, nested and transformed controls", () =>
    Effect.gen(function*() {
      const schemas = [
        Schema.TemplateLiteral([]),
        Schema.TemplateLiteral(["a", 1, 2n]),
        Schema.TemplateLiteral([Schema.String, "/", Schema.NonEmptyString]),
        Schema.TemplateLiteral([Schema.Number]),
        Schema.TemplateLiteral([Schema.FiniteFromString]),
        Schema.TemplateLiteral([Schema.BigInt]),
        Schema.TemplateLiteral([Schema.BigIntFromString]),
        Schema.TemplateLiteral([Schema.Union([Schema.Number, Schema.Literal("a")])]),
        Schema.TemplateLiteral([Schema.Union([Schema.BooleanFromBit, Schema.Literal("a")])]),
        Schema.TemplateLiteral(["[", Schema.TemplateLiteral([Schema.BooleanFromBit]), "]"])
      ]
      for (const schema of schemas) {
        const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), { ...options, count: 16, size: 4 })
        assert.lengthOf(values, 16)
        assert.isTrue(values.every(Schema.is(schema)), JSON.stringify(values))
        const seen: Array<unknown> = []
        const checked = yield* Arbitrary.checkEffect(Arbitrary.schema(schema), (value) => {
          seen.push(value)
          return false
        }, { runs: 1, size: 4, seed: 0, maxDiscards: 0, maxShrinks: 20 })
        assert.strictEqual(checked._tag, "Falsified")
        assert.isTrue(seen.every(Schema.is(schema)))
      }
    }))

  it.effect("retains decoded checks and filters invalid automatic shrinks", () =>
    Effect.gen(function*() {
      const part = Schema.FiniteFromString.check(Schema.isInt(), Schema.isBetween({ minimum: 2, maximum: 8 }))
      const schema = Schema.TemplateLiteral(["n:", part])
      assert.isFalse(Schema.is(schema)("n:0"))
      assert.isTrue(Schema.is(schema)("n:2"))
      const seen: Array<string> = []
      const result = yield* Arbitrary.checkEffect(Arbitrary.schema(schema), (value) => {
        seen.push(value)
        return false
      }, { runs: 1, size: 4, seed: 0, maxDiscards: 0, maxShrinks: 20 })
      assert.strictEqual(result._tag, "Falsified")
      assert.isTrue(seen.every(Schema.is(schema)))
      if (result._tag === "Falsified") {
        assert.strictEqual(result.shrunkInput, "n:2")
      }
      const bits = Schema.TemplateLiteral([Schema.BooleanFromBit])
      const bitSeen: Array<string> = []
      const bitResult = yield* Arbitrary.checkEffect(Arbitrary.schema(bits), (value) => {
        bitSeen.push(value)
        return false
      }, { runs: 1, size: 0, seed: 0, maxDiscards: 0, maxShrinks: 20 })
      assert.strictEqual(bitResult._tag, "Falsified")
      assert.deepStrictEqual(bitSeen, ["1", "0"])
      assert.isTrue(bitSeen.every(Schema.is(bits)))
      if (bitResult._tag === "Falsified") assert.strictEqual(bitResult.shrinks, 1)
      const checkedBits = Schema.TemplateLiteral([Schema.BooleanFromBit.check(Schema.makeFilter((value) => value))])
      const checkedSeen: Array<string> = []
      const checkedResult = yield* Arbitrary.checkEffect(Arbitrary.schema(checkedBits), (value) => {
        checkedSeen.push(value)
        return false
      }, { runs: 1, size: 0, seed: 0, maxDiscards: 0, maxShrinks: 20 })
      assert.strictEqual(checkedResult._tag, "Falsified")
      assert.deepStrictEqual(checkedSeen, ["1"])
      assert.isTrue(checkedSeen.every(Schema.is(checkedBits)))
    }))

  it.effect("encodes and decodes once per root without rerunning outer checks", () =>
    Effect.gen(function*() {
      let encodes = 0
      let decodes = 0
      let checks = 0
      let outer = 0
      const services: Array<number> = []
      const part = Schema.Literals([0, 1]).pipe(Schema.decodeTo(
        Schema.Boolean.check(Schema.makeFilter(() => {
          checks++
          return true
        })),
        SchemaTransformation.transformOrFail({
          decode: (value) =>
            Effect.map(Scheduler.MaxOpsBeforeYield, (service) => {
              services.push(service)
              decodes++
              return value === 1
            }),
          encode: (value) =>
            Effect.map(Scheduler.MaxOpsBeforeYield, (service) => {
              services.push(service)
              encodes++
              return value ? 1 : 0
            })
        })
      ))
      const schema = Schema.TemplateLiteral([part]).check(Schema.makeFilter(() => {
        outer++
        return true
      }))
      const values = yield* Arbitrary.sampleEffect(Arbitrary.schema(schema), options).pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 23)
      )
      assert.deepStrictEqual({ encodes, decodes, checks, outer }, { encodes: 1, decodes: 1, checks: 3, outer: 1 })
      assert.deepStrictEqual(services, [23, 23])
      assert.isTrue(values.every(Schema.is(schema)))
      encodes =
        decodes =
        checks =
        outer =
          0
      services.length = 0
      const seen: Array<string> = []
      const result = yield* Arbitrary.checkEffect(Arbitrary.schema(schema), (value) => {
        seen.push(value)
        return false
      }, { runs: 1, size: 0, seed: 0, maxDiscards: 0, maxShrinks: 20 }).pipe(
        Effect.provideService(Scheduler.MaxOpsBeforeYield, 23)
      )
      assert.strictEqual(result._tag, "Falsified")
      assert.deepStrictEqual(seen, ["1", "0"])
      assert.deepStrictEqual({ encodes, decodes, checks, outer }, { encodes: 2, decodes: 2, checks: 6, outer: 2 })
      assert.deepStrictEqual(services, [23, 23, 23, 23])
    }))

  it.effect("validates the decoded result even for a non-inverse encoder", () =>
    Effect.gen(function*() {
      let encodes = 0
      let decodes = 0
      const part = Schema.Literals([0, 1]).pipe(Schema.decodeTo(
        Schema.Boolean.check(Schema.makeFilter((value) => value)),
        SchemaTransformation.transform<boolean, 0 | 1>({
          decode: (value) => {
            decodes++
            return value === 1
          },
          encode: () => {
            encodes++
            return 0
          }
        })
      ))
      const schema = Schema.TemplateLiteral([part])
      assert.isFalse(Schema.is(schema)("0"))
      assert.isTrue(Schema.is(schema)("1"))
      decodes = 0
      const result = yield* Effect.result(
        Arbitrary.sampleEffect(Arbitrary.schema(schema), { ...options, maxDiscards: 4 })
      )
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.deepStrictEqual(result.failure, { _tag: "SampleError", generated: 0, discards: 5, seed: 0 })
      }
      assert.isAbove(encodes, 0)
      assert.strictEqual(decodes, encodes)
      assert.isAtMost(encodes, 5)
    }))

  it.effect("bounds typed encoding failures to one encoder call per attempt", () =>
    Effect.gen(function*() {
      let encodes = 0
      const part = Schema.Literal("x").pipe(Schema.decodeTo(
        Schema.Literal(1),
        SchemaTransformation.transformOrFail<1, "x">({
          decode: () => Effect.succeed(1 as const),
          encode: () => {
            encodes++
            return Effect.fail(new SchemaIssue.InvalidValue({ message: "cannot encode" }, 1))
          }
        })
      ))
      const result = yield* Effect.result(
        Arbitrary.sampleEffect(Arbitrary.schema(Schema.TemplateLiteral([part])), options)
      )
      assert.isTrue(Result.isFailure(result))
      if (Result.isFailure(result)) {
        assert.deepStrictEqual(result.failure, { _tag: "SampleError", generated: 0, discards: 1, seed: 0 })
      }
      assert.strictEqual(encodes, 1)
    }))

  it.effect("does not swallow encoding defects", () =>
    Effect.gen(function*() {
      const defect = new Error("encoder defect")
      const part = Schema.Literal("x").pipe(Schema.decodeTo(
        Schema.Literal(1),
        SchemaTransformation.transform<1, "x">({
          decode: () => 1 as const,
          encode: () => {
            throw defect
          }
        })
      ))
      const exit = yield* Effect.exit(Arbitrary.sampleEffect(Arbitrary.schema(Schema.TemplateLiteral([part])), options))
      assert.isTrue(Exit.isFailure(exit))
      if (Exit.isFailure(exit)) assert.isTrue(Cause.hasDies(exit.cause))
    }))
})
