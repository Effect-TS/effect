import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema/struct", () => {
  it("should allow a \"constructor\" field name", () => {
    const schema = S.struct({ constructor: S.string })
    expect(schema.ast._tag).toEqual("TypeLiteral")
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.struct({}).pipe(S.identifier("MyDataType"))
      await Util.expectParseFailure(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
      await Util.expectParseFailureTree(
        schema,
        null,
        `error(s) found
└─ Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.struct({})
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })
      await Util.expectParseSuccess(schema, [])

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.struct({ a: S.number })
      await Util.expectParseSuccess(schema, { a: 1 })

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
      await Util.expectParseFailure(schema, {}, "/a is missing")
      await Util.expectParseFailure(
        schema,
        { a: undefined },
        "/a Expected number, actual undefined"
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: "b" },
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      await Util.expectParseSuccess(schema, { a: 1 })
      await Util.expectParseSuccess(schema, { a: undefined })

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
      await Util.expectParseFailure(schema, {}, "/a is missing")
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: "b" },
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature", async () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a Expected number, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { a: undefined },
        `/a Expected number, actual undefined`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: "b" },
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature with undefined", async () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined), { exact: true }) })
      await Util.expectParseSuccess(schema, {})
      await Util.expectParseSuccess(schema, { a: 1 })
      await Util.expectParseSuccess(schema, { a: undefined })

      await Util.expectParseFailure(
        schema,
        null,
        `Expected <anonymous type literal schema>, actual null`
      )
      await Util.expectParseFailure(
        schema,
        { a: "a" },
        `/a union member: Expected number, actual "a", union member: Expected undefined, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        { a: 1, b: "b" },
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("should not add optional keys", async () => {
      const schema = S.struct({
        a: S.optional(S.string, { exact: true }),
        b: S.optional(S.number, { exact: true })
      })
      await Util.expectParseSuccess(schema, {})
    })
  })

  describe("encoding", () => {
    it("empty", async () => {
      const schema = S.struct({})
      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, [], [])

      await Util.expectEncodeFailure(
        schema,
        null as any,
        `Expected <anonymous type literal schema>, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.struct({ a: S.number })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature", async () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature with undefined", async () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined), { exact: true }) })
      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `/b is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("should handle symbols as keys", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const schema = S.struct({ [a]: S.string })
      await Util.expectEncodeSuccess(schema, { [a]: "a" }, { [a]: "a" })
    })
  })
})
