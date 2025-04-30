import type { HttpApiEndpoint } from "@effect/platform"
import { HttpApiBuilder } from "@effect/platform"
import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { identity, Schema } from "effect"

const assertNormalizedUrlParams = <UrlParams extends Schema.Schema.Any>(
  schema: UrlParams & HttpApiEndpoint.HttpApiEndpoint.ValidateUrlParams<UrlParams>,
  params: Record<string, string | Array<string>>,
  expected: Record<string, string | Array<string>>
) => {
  deepStrictEqual(HttpApiBuilder.normalizeUrlParams(params, schema.ast), expected)
}

describe("HttpApiBuilder", () => {
  describe("normalizeUrlParams", () => {
    describe("Property Signatures", () => {
      it("Enums", () => {
        enum Fruits {
          A = "a",
          B = "b"
        }

        const schema = Schema.Struct({
          a: Schema.Enums(Fruits)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: "b" }, { a: "b" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["b"] }, { a: ["b"] })
      })

      it("TemplateLiteral", () => {
        const schema = Schema.Struct({
          a: Schema.TemplateLiteral("a", Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("String", () => {
        const schema = Schema.Struct({ a: Schema.String })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("Array(String)", () => {
        const schema = Schema.Struct({ a: Schema.Array(Schema.String) })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("Array(String) + minItems", () => {
        const schema = Schema.Struct({ a: Schema.Array(Schema.String).pipe(Schema.minItems(2)) })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("NonEmptyArray(String)", () => {
        const schema = Schema.Struct({ a: Schema.NonEmptyArray(Schema.String) })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("optional(NonEmptyArray(String))", () => {
        const schema = Schema.Struct({ a: Schema.optional(Schema.NonEmptyArray(Schema.String)) })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("Tuple", () => {
        const schema = Schema.Struct({ a: Schema.Tuple(Schema.String) })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("NonEmptyArrayEnsure", () => {
        const schema = Schema.Struct({
          a: Schema.NonEmptyArrayEnsure(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("ArrayEnsure", () => {
        const schema = Schema.Struct({
          a: Schema.ArrayEnsure(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      describe("Union", () => {
        it("TemplateLiteral + Tuple", () => {
          const schema = Schema.Struct({
            a: Schema.Union(Schema.TemplateLiteral("a", Schema.String), Schema.Tuple(Schema.String))
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("Literal + Tuple", () => {
          const schema = Schema.Struct({ a: Schema.Union(Schema.Literal("a"), Schema.Tuple(Schema.String)) })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("String + Tuple", () => {
          const schema = Schema.Struct({ a: Schema.Union(Schema.String, Schema.Tuple(Schema.String)) })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("Tuple + Tuple", () => {
          const schema = Schema.Struct({
            a: Schema.Union(
              Schema.Tuple(Schema.NumberFromString),
              Schema.Tuple(Schema.BooleanFromString)
            )
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })
      })
    })

    describe("Index Signatures", () => {
      it("Enums", () => {
        enum Fruits {
          A = "a",
          B = "b"
        }

        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.Enums(Fruits)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: "b" }, { a: "b" })
      })

      it("TemplateLiteral", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.TemplateLiteral("a", Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
      })

      it("String", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.String
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
      })

      it("Array(String)", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.Array(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("Array(String) + minItems", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.Array(Schema.String).pipe(Schema.minItems(2))
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("NonEmptyArray(String)", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.NonEmptyArray(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("Tuple", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.Tuple(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("ArrayEnsure", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.ArrayEnsure(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      it("NonEmptyArrayEnsure", () => {
        const schema = Schema.Record({
          key: Schema.String,
          value: Schema.NonEmptyArrayEnsure(Schema.String)
        })
        assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
        assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
      })

      describe("Union", () => {
        it("TemplateLiteral + Tuple", () => {
          const schema = Schema.Record({
            key: Schema.String,
            value: Schema.Union(Schema.TemplateLiteral("a", Schema.String), Schema.Tuple(Schema.String))
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("Literal + Tuple", () => {
          const schema = Schema.Record({
            key: Schema.String,
            value: Schema.Union(Schema.Literal("a"), Schema.Tuple(Schema.String))
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("String + Tuple", () => {
          const schema = Schema.Record({
            key: Schema.String,
            value: Schema.Union(Schema.String, Schema.Tuple(Schema.String))
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })

        it("Tuple + Tuple", () => {
          const schema = Schema.Record({
            key: Schema.String,
            value: Schema.Union(
              Schema.Tuple(Schema.NumberFromString),
              Schema.Tuple(Schema.BooleanFromString)
            )
          })
          assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
          assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
        })
      })
    })

    it("Property Signatures + Index Signatures", () => {
      const schema = Schema.Struct({
        a: Schema.Array(Schema.String).pipe(Schema.minItems(2)),
        b: Schema.Tuple(Schema.String, Schema.String)
      }, { key: Schema.String, value: Schema.Array(Schema.String) })
      assertNormalizedUrlParams(schema, { a: "a", b: "b", c: "c" }, { a: ["a"], b: ["b"], c: ["c"] })
    })

    it("Union", () => {
      const schema = Schema.Union(
        Schema.Struct({ a: Schema.String }),
        Schema.Struct({ a: Schema.Array(Schema.String) })
      )
      assertNormalizedUrlParams(schema, { a: "a" }, { a: "a" })
      assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
    })

    it("Refinement", () => {
      const schema = Schema.Struct({ a: Schema.Array(Schema.String) }).pipe(Schema.filter(() => true))
      assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
      assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
    })

    it("Transformation", () => {
      const struct = Schema.Struct({ a: Schema.Array(Schema.String) })
      const schema = Schema.transform(struct, struct, { strict: true, decode: identity, encode: identity })
      assertNormalizedUrlParams(schema, { a: "a" }, { a: ["a"] })
      assertNormalizedUrlParams(schema, { a: ["a"] }, { a: ["a"] })
    })
  })
})
