import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Struct", () => {
  it("annotations()", () => {
    const schema = S.Struct({}).annotations({ identifier: "X" }).annotations({ title: "Y" })
    expect(schema.ast.annotations).toStrictEqual({
      [AST.IdentifierAnnotationId]: "X",
      [AST.TitleAnnotationId]: "Y"
    })
  })

  it("should expose the fields", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.Number
    })
    expect(schema.fields).toStrictEqual({
      a: S.String,
      b: S.Number
    })
  })

  it("should return the literal interface when using the .annotations() method", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.Number
    }).annotations({ identifier: "struct test" })
    expect(schema.ast.annotations).toStrictEqual({ [AST.IdentifierAnnotationId]: "struct test" })
    expect(schema.fields).toStrictEqual({
      a: S.String,
      b: S.Number
    })
  })

  it(`should allow a "constructor" field name`, () => {
    const schema = S.Struct({ constructor: S.String })
    expect(schema.ast._tag).toEqual("TypeLiteral")
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.Struct({}).annotations({ identifier: "MyDataType" })
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.Struct({})
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
      const schema = S.Struct({ a: S.Number })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { readonly a: number }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        {},
        `{ readonly a: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: undefined })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { readonly a: number | undefined }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ readonly a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("exact optional property signature", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { readonly a?: number }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ readonly a?: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("exact optional property signature with undefined", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })

      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `Expected { readonly a?: number | undefined }, actual null`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: "a" },
        `{ readonly a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        { a: 1, b: "b" },
        `{ readonly a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("should not add optional keys", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.String, { exact: true }),
        b: S.optionalWith(S.Number, { exact: true })
      })
      await Util.expectDecodeUnknownSuccess(schema, {})
    })

    it.skip("should preserve the order of properties (sync)", () => {
      const b = Symbol.for("effect/Schema/test/b")
      const schema = S.Struct({
        a: S.Literal("a"),
        [b]: S.Array(S.String),
        c: S.Record({ key: S.String, value: S.Number }),
        d: S.NumberFromString,
        e: S.Boolean
      })
      const input = { [b]: ["b"], c: { c: 1 }, d: "1", e: true, a: "a" }
      const output = S.decodeUnknownSync(schema)(input)
      const expectedOutput = { [b]: ["b"], c: { c: 1 }, d: 1, e: true, a: "a" }
      expect(output).toStrictEqual(expectedOutput)
      expect(Reflect.ownKeys(output)).toStrictEqual(Reflect.ownKeys(input))
    })
  })

  describe("encoding", () => {
    it("empty", async () => {
      const schema = S.Struct({})
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
      const schema = S.Struct({ a: S.Number })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("exact optional property signature", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a?: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("exact optional property signature with undefined", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      await Util.expectEncodeSuccess(schema, {}, {})
      await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
      await Util.expectEncodeSuccess(schema, { a: undefined }, { a: undefined })
      await Util.expectEncodeFailure(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        Util.onExcessPropertyError
      )
    })

    it("should handle symbols as keys", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Struct({ [a]: S.String })
      await Util.expectEncodeSuccess(schema, { [a]: "a" }, { [a]: "a" })
    })
  })
})
