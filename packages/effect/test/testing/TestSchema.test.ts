import { assert, describe, it } from "@effect/vitest"
import * as testAssert from "@effect/vitest/utils"
import { Context, Effect, Schema, SchemaGetter, SchemaIssue } from "effect"
import * as SchemaTransformation from "effect/SchemaTransformation"
import { TestSchema } from "effect/testing"

describe("TestSchema", () => {
  describe("ast.fields.equals", () => {
    const equals = TestSchema.Asserts.ast.fields.equals

    it("compares fresh string fields and tuple elements by AST", () => {
      const left = Schema.Literal("value")
      const right = Schema.Literal("value")
      assert.notStrictEqual(left, right)
      assert.deepStrictEqual(left.ast, right.ast)
      equals({ field: left }, { field: right })
      TestSchema.Asserts.ast.elements.equals([left], [right])
    })

    it("compares fresh symbol fields by AST", () => {
      const key = Symbol("field")
      const left = Schema.Literal("value")
      const right = Schema.Literal("value")
      assert.notStrictEqual(left, right)
      assert.deepStrictEqual(left.ast, right.ast)
      equals({ [key]: left }, { [key]: right })
    })

    it("accepts a reused schema at the same symbol", () => {
      const key = Symbol("field")
      const schema = Schema.Literal("value")
      equals({ [key]: schema }, { [key]: schema })
    })

    it("rejects unequal ASTs and missing fields", () => {
      const key = Symbol("field")
      assert.throws(() => equals({ [key]: Schema.Literal("left") }, { [key]: Schema.Literal("right") }))
      assert.throws(() => equals({ [key]: Schema.Literal("value") }, {}))
      assert.throws(() => equals({}, { [key]: Schema.Literal("value") }))
      assert.throws(() => equals({ field: Schema.Literal("left") }, { field: Schema.Literal("right") }))
    })

    it("preserves symbol identity even with equal descriptions", () => {
      const left: symbol = Symbol("field")
      const right: symbol = Symbol("field")
      const schema = Schema.Literal("value")
      assert.notStrictEqual(left, right)
      assert.throws(() => equals({ [left]: schema }, { [right]: schema }))
    })

    it("compares mixed string, numeric, and symbol fields", () => {
      const key = Symbol("field")
      const fields = () => ({ field: Schema.Literal("text"), 1: Schema.Literal(1), [key]: Schema.Literal(true) })
      equals(fields(), fields())
      equals({ 1: Schema.Literal(1) }, { "1": Schema.Literal(1) })
      assert.throws(() => equals({ 1: Schema.Literal(1) }, { 1: Schema.Literal(2) }))
    })

    it("preserves annotations and optionality at symbol fields", () => {
      const key = Symbol("field")
      const annotated = () => Schema.Literal("value").annotate({ title: "Field" })
      const optional = () => Schema.optionalKey(Schema.Literal("value"))
      equals({ [key]: annotated() }, { [key]: annotated() })
      equals({ [key]: optional() }, { [key]: optional() })
      assert.throws(() => equals({ [key]: annotated() }, { [key]: Schema.Literal("value") }))
      assert.throws(() => equals({ [key]: optional() }, { [key]: Schema.Literal("value") }))
    })

    it("preserves own __proto__ and constructor fields", () => {
      const fields = () => ({ ["__proto__"]: Schema.Literal("proto"), constructor: Schema.Literal("ctor") })
      const left = fields()
      assert.isTrue(Object.hasOwn(left, "__proto__"))
      assert.isTrue(Object.hasOwn(left, "constructor"))
      equals(left, fields())
      assert.throws(() => equals(left, { constructor: Schema.Literal("ctor") }))
      assert.throws(() => equals(left, { ["__proto__"]: Schema.Literal("other"), constructor: Schema.Literal("ctor") }))
      assert.strictEqual(Object.getPrototypeOf(left), Object.prototype)
    })

    it("uses the Struct own-key contract for non-enumerable fields", () => {
      const key = Symbol("hidden")
      const fields = (value: string): Schema.Struct.Fields =>
        Object.defineProperties({}, {
          hidden: { value: Schema.Literal(value) },
          [key]: { value: Schema.Literal(value) }
        })
      const left = fields("value")
      const right = fields("value")
      assert.deepStrictEqual(Object.keys(left), [])
      assert.deepStrictEqual(Reflect.ownKeys(left), ["hidden", key])
      assert.deepStrictEqual(Schema.Struct(left).ast.propertySignatures.map((field) => field.name), ["hidden", key])
      assert.deepStrictEqual(Schema.Struct(left).ast, Schema.Struct(right).ast)
      equals(left, right)
      equals(left, { hidden: Schema.Literal("value"), [key]: Schema.Literal("value") })
      assert.throws(() => equals(left, fields("other")))
      assert.throws(() => equals(left, {}))
    })
  })

  it("decoding", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    const decoding = asserts.decoding()
    await decoding.succeed("1", 1)
    await decoding.fail("-1", `Expected a value greater than 0`)
    await decoding.fail("a", `Expected a finite number`)
  })

  it("decoding.provide", async () => {
    class Service extends Context.Service<Service, { fallback: Effect.Effect<string> }>()("Service") {}

    const schema = Schema.String.pipe(
      Schema.decode({
        decode: SchemaGetter.checkEffect((s) =>
          Effect.gen(function*() {
            yield* Service
            if (s.length === 0) {
              return new SchemaIssue.InvalidValue({
                message: "input should not be empty string"
              })
            }
          })
        ),
        encode: SchemaGetter.passthrough()
      })
    )
    const asserts = new TestSchema.Asserts(schema)

    const decoding = asserts.decoding().provide(Service, { fallback: Effect.succeed("b") })
    await decoding.succeed("a")
    await decoding.fail("", "input should not be empty string")
  })

  it("encoding", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    const encoding = asserts.encoding()
    await encoding.succeed(1, "1")
    await encoding.fail(-1, `Expected a value greater than 0`)
  })

  it("encoding.provide", async () => {
    class Service extends Context.Service<Service, { fallback: Effect.Effect<string> }>()("Service") {}

    const schema = Schema.String.pipe(
      Schema.decode({
        decode: SchemaGetter.passthrough(),
        encode: SchemaGetter.checkEffect((s) =>
          Effect.gen(function*() {
            yield* Service
            if (s.length === 0) {
              return new SchemaIssue.InvalidValue({
                message: "input should not be empty string"
              })
            }
          })
        )
      })
    )
    const asserts = new TestSchema.Asserts(schema)

    const encoding = asserts.encoding().provide(Service, { fallback: Effect.succeed("b") })
    await encoding.succeed("a")
    await encoding.fail("", "input should not be empty string")
  })

  it("verifyLosslessTransformation", async () => {
    const schema = Schema.FiniteFromString.check(Schema.isGreaterThan(0))
    const asserts = new TestSchema.Asserts(schema)
    await asserts.verifyLosslessTransformation({ runs: 20, seed: "lossless" })
  })

  it("verifyLosslessTransformation reports a shrunk input and replay", async () => {
    const schema = Schema.Number.pipe(
      Schema.decodeTo(
        Schema.Number,
        SchemaTransformation.transform({ decode: (value) => value, encode: () => 0 })
      )
    )
    const asserts = new TestSchema.Asserts(schema)

    await testAssert.throwsAsync(
      () => asserts.verifyLosslessTransformation({ runs: 20, seed: "lossy" }),
      (error) => {
        assert.instanceOf(error, Error)
        assert.match(error.message, /Property falsified/)
        assert.match(error.message, /Shrunk input:/)
        assert.match(error.message, /Replay:/)
      }
    )
  })

  it("verifyGeneration bounds residual discards", () => {
    const schema = Schema.Null.check(Schema.makeFilter(() => false))
    const asserts = new TestSchema.Asserts(schema)

    assert.throws(
      () => asserts.arbitrary().verifyGeneration({ runs: 1, maxDiscards: 2, seed: "exhausted" }),
      /Property exhausted after 0 run\(s\) and 3 discard\(s\)/
    )
  })
})
