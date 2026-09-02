import { assert, describe, it } from "@effect/vitest"
import { DateTime, Effect, Option, Schema } from "effect"
import { Model, VariantSchema } from "effect/unstable/schema"

describe("VariantSchema", () => {
  it("FieldOnly and FieldExcept select fields from key arrays", () => {
    const Test = VariantSchema.make({
      variants: ["a", "b", "c"],
      defaultVariant: "a"
    })
    const struct = Test.Struct({
      common: Schema.String,
      onlyB: Test.FieldOnly(["b"])(Schema.Number),
      exceptC: Test.FieldExcept(["c"])(Schema.Boolean)
    })

    assert.deepStrictEqual(Object.keys(Test.extract(struct, "a").fields), ["common", "exceptC"])
    assert.deepStrictEqual(Object.keys(Test.extract(struct, "b").fields), ["common", "onlyB", "exceptC"])
    assert.deepStrictEqual(Object.keys(Test.extract(struct, "c").fields), ["common"])
  })

  it("Class preserves class and variant schema behavior", () => {
    const Test = VariantSchema.make({
      variants: ["a", "b"],
      defaultVariant: "a"
    })
    class User extends Test.Class<User>("User")({
      id: Test.FieldOnly(["a"])(Schema.Number),
      name: Schema.String
    }) {}

    const user = User.make({ id: 1, name: "Alice" })

    assert.isTrue(user instanceof User)
    assert.deepStrictEqual(user, new User({ id: 1, name: "Alice" }))
    assert.deepStrictEqual(Schema.decodeSync(User)({ id: 1, name: "Alice" }), user)
    assert.deepStrictEqual(Schema.decodeSync(User.b)({ name: "Alice" }), { name: "Alice" })
    assert.deepStrictEqual(Object.keys(User.fields), ["id", "name"])
  })

  it("includes plain variant structs in the default union", () => {
    const Test = VariantSchema.make({ variants: ["a", "b"], defaultVariant: "a" })
    const first = Test.Struct({ value: Schema.String })
    const second = Test.Struct({ value: Schema.Number })
    const union = Test.Union([first, second])

    assert.strictEqual(union.members.length, 2)
    assert.deepStrictEqual(Schema.decodeUnknownSync(union)({ value: "foo" }), { value: "foo" })
    assert.deepStrictEqual(Schema.decodeUnknownSync(union)({ value: 42 }), { value: 42 })
  })

  it("omits undefined fields accepted by VariantSchema.Struct", () => {
    const Test = VariantSchema.make({ variants: ["a"], defaultVariant: "a" })
    const struct = Test.Struct({ value: Schema.String, skipped: undefined })

    assert.deepStrictEqual(Object.keys(Test.extract(struct, "a").fields), ["value"])
  })

  it("omits undefined fields selected by VariantSchema.Field", () => {
    const Test = VariantSchema.make({ variants: ["a"], defaultVariant: "a" })
    const struct = Test.Struct({ value: Schema.String, skipped: Test.Field({ a: undefined }) })

    assert.deepStrictEqual(Object.keys(Test.extract(struct, "a").fields), ["value"])
  })

  it("does not collide the __default variant with the default-schema cache entry", () => {
    const Test = VariantSchema.make({ variants: ["a", "__default"], defaultVariant: "a" })
    const defaultFirst = Test.Struct({
      value: Test.Field({ a: Schema.String, __default: Schema.Number })
    })

    Test.extract(defaultFirst, "a")

    assert.strictEqual(Test.extract(defaultFirst, "__default").fields.value, Schema.Number)

    const namedFirst = Test.Struct({
      value: Test.Field({ a: Schema.String, __default: Schema.Number })
    })

    Test.extract(namedFirst, "__default")

    assert.strictEqual(Test.extract(namedFirst, "a").fields.value, Schema.String)
  })
})

describe("Model", () => {
  it("preserves classes when extracting the default variant", () => {
    class Person extends Model.Class<Person>("Person")({
      name: Schema.String
    }) {}

    const person = Schema.decodeSync(Model.extract(Person, "select"))({ name: "Alex" })

    assert.isTrue(person instanceof Person)
  })

  describe("FieldOption", () => {
    const variants = ["select", "insert", "update", "json", "jsonCreate", "jsonUpdate"] as const
    const schemas = {
      select: Schema.String,
      insert: Schema.String,
      update: Schema.String,
      json: Schema.String,
      jsonCreate: Schema.String,
      jsonUpdate: Schema.String
    }

    it.each(variants)("preserves an explicitly undefined %s variant", (variant) => {
      const field = Model.Field({ ...schemas, [variant]: undefined })
      const optional = Model.FieldOption(field)
      const model = Model.Struct({ value: optional })
      const omitted = Model.extract(model, variant)

      assert.isTrue(Object.hasOwn(optional.schemas, variant))
      assert.strictEqual(optional.schemas[variant], undefined)
      assert.deepStrictEqual(Object.keys(omitted.fields), [])
      assert.deepStrictEqual<unknown>(Schema.decodeUnknownSync(omitted)({}), {})
      assert.deepStrictEqual<unknown>(Schema.encodeUnknownSync(omitted)({}), {})

      for (const retained of variants) {
        if (retained === variant) continue
        const schema = Model.extract(model, retained)
        assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({ value: null }), { value: Option.none() })
        assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({ value: "sample" }), { value: Option.some("sample") })
        assert.deepStrictEqual(Schema.encodeUnknownSync(schema)({ value: Option.some("sample") }), { value: "sample" })
        assert.strictEqual(field.schemas[retained], Schema.String)
      }
    })

    it("omits explicitly undefined variants before optionalization", () => {
      for (const variant of variants) {
        const model = Model.Struct({ value: Model.Field({ ...schemas, [variant]: undefined }) })
        const schema = Model.extract(model, variant)
        assert.deepStrictEqual(Object.keys(schema.fields), [])
        assert.deepStrictEqual<unknown>(Schema.decodeUnknownSync(schema)({}), {})
        assert.deepStrictEqual<unknown>(Schema.encodeUnknownSync(schema)({}), {})
      }
    })

    it.each(variants)("round-trips defined schemas in the %s variant", (variant) => {
      for (const field of [Schema.String, Model.Field(schemas)]) {
        const model = Model.Struct({ value: Model.FieldOption(field) })
        const schema = Model.extract(model, variant)
        const isJson = variant === "json" || variant === "jsonCreate" || variant === "jsonUpdate"

        assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({ value: null }), { value: Option.none() })
        assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({ value: "sample" }), { value: Option.some("sample") })
        assert.deepStrictEqual(Schema.encodeUnknownSync(schema)({ value: Option.some("sample") }), { value: "sample" })
        assert.deepStrictEqual<unknown>(
          Schema.encodeUnknownSync(schema)({ value: Option.none() }),
          isJson ? {} : { value: null }
        )
        if (isJson) {
          assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({}), { value: Option.none() })
        } else {
          assert.throws(() => Schema.decodeUnknownSync(schema)({}))
        }
      }
    })

    it("keeps absent variants omitted", () => {
      const model = Model.Struct({ value: Model.FieldOption(Model.Field({ select: Schema.String })) })
      assert.deepStrictEqual(Schema.decodeUnknownSync(Model.extract(model, "select"))({ value: null }), {
        value: Option.none()
      })
      for (const variant of variants) {
        if (variant === "select") continue
        const schema = Model.extract(model, variant)
        assert.deepStrictEqual(Object.keys(schema.fields), [])
        assert.deepStrictEqual(Schema.decodeUnknownSync(schema)({}), {})
      }
    })
  })

  it("fieldEvolve passes explicitly undefined variants to the callback", () => {
    const field = Model.fieldEvolve(Model.Field({ select: Schema.String, json: undefined }), {
      json: (schema) => {
        assert.strictEqual(schema, undefined)
        return Schema.String
      }
    })
    const json = Model.extract(Model.Struct({ value: field }), "json")

    assert.deepStrictEqual(Schema.decodeSync(json)({ value: "sample" }), { value: "sample" })
  })

  it("FieldOnly includes fields only in listed variants", () => {
    const InsertOnly = Model.Struct({
      value: Model.FieldOnly(["insert"])(Schema.String)
    })

    assert.deepStrictEqual(Object.keys(Model.extract(InsertOnly, "insert").fields), ["value"])
    assert.deepStrictEqual(Object.keys(Model.extract(InsertOnly, "select").fields), [])
  })

  it("BooleanSqlite encodes database bits and JSON booleans across variants", () => {
    const User = Model.Struct({
      active: Model.BooleanSqlite
    })

    const select = Model.extract(User, "select")
    const json = Model.extract(User, "json")
    const encodeSelect = Schema.encodeSync(select)
    const decodeSelect = Schema.decodeSync(select)
    const encodeJson = Schema.encodeSync(json)
    const decodeJson = Schema.decodeSync(json)

    assert.deepStrictEqual(encodeSelect({ active: true }), { active: 1 })
    assert.deepStrictEqual(decodeSelect({ active: 0 }), { active: false })
    assert.deepStrictEqual(encodeJson({ active: true }), { active: true })
    assert.deepStrictEqual(decodeJson({ active: false }), { active: false })
  })

  it.effect("Overrideable defaults are constructor-only and accept explicit overrides", () =>
    Effect.gen(function*() {
      const User = Model.Struct({
        createdAt: Model.DateTimeInsertFromNumber
      })

      const insert = Model.extract(User, "insert")

      const now = yield* DateTime.now
      const user = yield* insert.makeEffect({})
      assert.deepStrictEqual(user.createdAt, now)

      yield* Schema.encodeEffect(insert)({
        createdAt: Model.Override(now)
      })

      const error = yield* Schema.decodeUnknownEffect(insert)({}).pipe(
        Effect.flip
      )
      assert.include(error.message, "createdAt")
    }))
})
