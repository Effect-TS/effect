import * as VariantSchema from "@effect/experimental/VariantSchema"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, ParseResult, Schema } from "effect"

describe("VariantSchema", () => {
  describe("Overrideable", () => {
    it.effect("encoding without override uses generate function", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: () => Effect.succeed("generated-id")
          })
        })

        const encoded = yield* Schema.encode(schema)({})
        assert.deepStrictEqual(encoded, { id: "generated-id" })
      }))

    it.effect("encoding with Override uses provided value", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: (opt) => Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed("generated-id")
          })
        })

        const encoded = yield* Schema.encode(schema)({
          id: VariantSchema.Override("custom-id")
        })
        assert.deepStrictEqual(encoded, { id: "custom-id" })
      }))

    it.effect("decoding with no decode option returns object without the property", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: () => Effect.succeed("generated-id")
          })
        })

        const decoded = yield* Schema.decode(schema)({ id: "some-id" })
        assert.strictEqual("id" in decoded, false)
      }))

    it.effect("decoding uses decode option when provided", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: (opt) => Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed("generated-id"),
            decode: Schema.String
          })
        })

        const decoded = yield* Schema.decode(schema)({ id: "decoded-value" })
        assert.strictEqual(decoded.id, "decoded-value")
      }))

    it.effect("constructor allows omitting the property", () =>
      Effect.gen(function*() {
        class Test extends Schema.Class<Test>("Test")({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: () => Effect.succeed("generated-id")
          })
        }) {}

        const instance = new Test({})
        assert.strictEqual("id" in instance, false)
      }))

    it.effect("constructor uses constructorDefault when provided", () =>
      Effect.gen(function*() {
        class Test extends Schema.Class<Test>("Test")({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: (opt) => Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed("generated-id"),
            constructorDefault: () => VariantSchema.Override("default-id")
          })
        }) {}

        const instance = new Test({})
        assert.strictEqual(instance.id, "default-id")
      }))

    it.effect("generate receives Option.none when property is missing", () =>
      Effect.gen(function*() {
        let receivedOption: Option.Option<string> | undefined
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: (opt) => {
              receivedOption = opt
              return Effect.succeed("generated")
            }
          })
        })

        yield* Schema.encode(schema)({})
        assert.deepStrictEqual(receivedOption, Option.none())
      }))

    it.effect("generate receives Option.some when value is provided with Override", () =>
      Effect.gen(function*() {
        let receivedOption: Option.Option<string> | undefined
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: (opt) => {
              receivedOption = opt
              return Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed("generated")
            }
          })
        })

        yield* Schema.encode(schema)({ id: VariantSchema.Override("my-value") })
        assert.deepStrictEqual(receivedOption, Option.some("my-value"))
      }))

    it.effect("works with different From and To types", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          timestamp: VariantSchema.Overrideable(
            Schema.String,
            Schema.Date,
            {
              generate: (opt) =>
                Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed(new Date().toISOString()),
              decode: Schema.String
            }
          )
        })

        const now = new Date("2024-01-01T00:00:00.000Z")
        const encoded = yield* Schema.encode(schema)({
          timestamp: VariantSchema.Override(now)
        })
        assert.deepStrictEqual(encoded, { timestamp: now.toISOString() })

        const decoded = yield* Schema.decode(schema)({ timestamp: "2024-01-01T00:00:00.000Z" })
        assert.deepStrictEqual(
          (decoded.timestamp as Date)?.getTime(),
          new Date("2024-01-01T00:00:00.000Z").getTime()
        )
      }))

    it.effect("generate can return Effect with error", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          id: VariantSchema.Overrideable(Schema.String, Schema.String, {
            generate: () => ParseResult.fail(new ParseResult.Type(Schema.String.ast, "invalid", "Generation failed"))
          })
        })

        const result = yield* Schema.encode(schema)({}).pipe(Effect.flip)
        assert.include(String(result), "Generation failed")
      }))

    it.effect("works with Schema transformation on from type", () =>
      Effect.gen(function*() {
        const schema = Schema.Struct({
          count: VariantSchema.Overrideable(Schema.NumberFromString, Schema.Number, {
            generate: (opt) => Option.isSome(opt) ? Effect.succeed(opt.value) : Effect.succeed(0)
          })
        })

        const encoded = yield* Schema.encode(schema)({ count: VariantSchema.Override(42) })
        assert.deepStrictEqual(encoded, { count: "42" })

        const encodedDefault = yield* Schema.encode(schema)({})
        assert.deepStrictEqual(encodedDefault, { count: "0" })
      }))
  })

  describe("Override", () => {
    it("brands the value", () => {
      const value = VariantSchema.Override("test")
      assert.strictEqual(value, "test")
    })

    it("works with different types", () => {
      const stringValue = VariantSchema.Override("hello")
      const numberValue = VariantSchema.Override(123)
      const objectValue = VariantSchema.Override({ foo: "bar" })

      assert.strictEqual(stringValue, "hello")
      assert.strictEqual(numberValue, 123)
      assert.strictEqual((objectValue as { foo: string }).foo, "bar")
    })
  })
})
