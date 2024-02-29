import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > struct", () => {
  it("annotations()", () => {
    const schema = S.struct({}).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the fields", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    expect(schema.fields).toStrictEqual({
      a: S.string,
      b: S.number
    })
  })

  it("should return the literal interface when using the .annotations() method", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    }).annotations({ identifier: "struct test" })
    expect(schema.ast.annotations).toStrictEqual({ [AST.IdentifierAnnotationId]: "struct test" })
    expect(schema.fields).toStrictEqual({
      a: S.string,
      b: S.number
    })
  })

  it("should return the same reference when using .annotations(undefined)", () => {
    const schema = S.struct({
      a: S.string,
      b: S.number
    })
    const copy = schema.annotations(undefined)
    expect(schema === copy).toBe(true)
  })

  it(`should allow a "constructor" field name`, () => {
    const schema = S.struct({ constructor: S.string })
    expect(schema.ast._tag).toEqual("TypeLiteral")
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.struct({}).annotations({ identifier: "MyDataType" })
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.struct({})
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, [])

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected {}, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.struct({ a: S.number })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a: number }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ a: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ a: number }
└─ ["a"]
   └─ Expected a number, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.struct({ a: S.union(S.number, S.undefined) })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: undefined })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a: number | undefined }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature", async () => {
      const schema = S.struct({ a: S.optional(S.number, { exact: true }) })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a?: number }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ a?: number }
└─ ["a"]
   └─ Expected a number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ a?: number }
└─ ["a"]
   └─ Expected a number, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ a?: number }
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("optional property signature with undefined", async () => {
      const schema = S.struct({ a: S.optional(S.union(S.number, S.undefined), { exact: true }) })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { a?: number | undefined }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected "a"`,
        Util.onExcessPropertyError
      )
    })

    it("should not add optional keys", async () => {
      const schema = S.struct({
        a: S.optional(S.string, { exact: true }),
        b: S.optional(S.number, { exact: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {})
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
        `Expected {}, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.struct({ a: S.number })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`,
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
        `{ a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected "a"`,
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
        `{ a?: number }
└─ ["b"]
   └─ is unexpected, expected "a"`,
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
        `{ a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected "a"`,
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
