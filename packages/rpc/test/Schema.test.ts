import * as _ from "@effect/rpc/Schema"
import * as S from "@effect/schema/Schema"
import { describe, expect, expectTypeOf, it } from "vitest"

describe("Schema", () => {
  describe("types", () => {
    it("io", () => {
      const schema = _.make({
        greet: {
          input: S.string,
          output: S.string,
          error: S.never
        }
      })

      expectTypeOf(schema.greet).toEqualTypeOf<{
        readonly input: S.Schema<string, string>
        readonly output: S.Schema<string, string>
        readonly error: S.Schema<never, never>
      }>()
    })

    it("nested io", () => {
      const schema = _.make({
        greet: {
          input: S.string,
          output: S.string,
          error: S.never
        }
      })

      const parent = _.make({
        nested: schema
      })

      expectTypeOf(parent.nested.greet).toEqualTypeOf<{
        readonly input: S.Schema<string, string>
        readonly output: S.Schema<string, string>
        readonly error: S.Schema<never, never>
      }>()
    })

    it("no input", () => {
      const schema = _.make({
        greet: {
          output: S.string,
          error: S.never
        }
      })

      expectTypeOf(schema.greet).toEqualTypeOf<{
        readonly output: S.Schema<string, string>
        readonly error: S.Schema<never, never>
      }>()
    })

    it("no error", () => {
      const schema = _.make({
        greet: {
          input: S.string,
          output: S.string
        }
      })

      expectTypeOf(schema.greet).toEqualTypeOf<{
        readonly input: S.Schema<string, string>
        readonly output: S.Schema<string, string>
      }>()
    })

    it("no input or error", () => {
      const schema = _.make({
        greet: {
          output: S.string
        }
      })

      expectTypeOf(schema.greet).toEqualTypeOf<{
        readonly output: S.Schema<string, string>
      }>()
    })

    it("validates/Json", () => {
      const schema = _.make({
        currentTime: {
          output: S.DateFromSelf,
          error: S.never
        },

        currentTime2: {
          output: S.Date,
          error: S.never
        }
      })

      expectTypeOf(
        schema.currentTime
      ).toEqualTypeOf<"schema input does not extend Schema.Json">()

      expectTypeOf(schema.currentTime2).toEqualTypeOf<{
        readonly output: S.Schema<string, Date>
        readonly error: S.Schema<never, never>
      }>()
    })

    it("request union", () => {
      const schema = _.makeRequestUnion({
        greet: {
          input: S.string,
          output: S.string,
          error: S.never
        },

        currentTime: {
          output: S.DateFromString,
          error: S.never
        }
      })

      expect(
        S.decodeSync(schema)({
          _tag: "greet",
          input: "John"
        })
      ).toEqual({
        _tag: "greet",
        input: "John"
      })

      expect(S.decodeSync(schema)({ _tag: "currentTime" })).toEqual({
        _tag: "currentTime"
      })

      expect(S.parseEither(schema)({ _tag: "greet", input: 123 })._tag).toEqual(
        "Left"
      )
    })
  })
})
