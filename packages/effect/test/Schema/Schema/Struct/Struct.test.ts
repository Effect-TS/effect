import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../../TestUtils.js"

describe("Struct", () => {
  it("should expose the fields", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.Number
    })
    deepStrictEqual(schema.fields, {
      a: S.String,
      b: S.Number
    })
  })

  it("should return the literal interface when using the .annotations() method", () => {
    const schema = S.Struct({
      a: S.String,
      b: S.Number
    }).annotations({ identifier: "struct test" })
    deepStrictEqual(schema.ast.annotations, { [AST.IdentifierAnnotationId]: "struct test" })
    deepStrictEqual(schema.fields, {
      a: S.String,
      b: S.Number
    })
  })

  it(`should allow a "constructor" field name`, () => {
    const schema = S.Struct({ constructor: S.String })
    strictEqual(schema.ast._tag, "TypeLiteral")
  })

  describe("decoding", () => {
    it("should use annotations to generate a more informative error message when an incorrect data type is provided", async () => {
      const schema = S.Struct({}).annotations({ identifier: "MyDataType" })
      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected MyDataType, actual null`
      )
    })

    it("empty", async () => {
      const schema = S.Struct({})
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })
      await Util.assertions.decoding.succeed(schema, [])

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected {}, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.Struct({ a: S.Number })
      await Util.assertions.decoding.succeed(schema, { a: 1 })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected { readonly a: number }, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        {},
        `{ readonly a: number }
└─ ["a"]
   └─ is missing`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: undefined },
        `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "b" },
        `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      await Util.assertions.decoding.succeed(schema, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: undefined })
      await Util.assertions.decoding.succeed(schema, {}, { a: undefined })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected { readonly a: number | undefined }, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "b" },
        `{ readonly a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("exact optional property signature", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected { readonly a?: number }, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: undefined },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "b" },
        `{ readonly a?: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("exact optional property signature with undefined", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      await Util.assertions.decoding.succeed(schema, {})
      await Util.assertions.decoding.succeed(schema, { a: 1 })
      await Util.assertions.decoding.succeed(schema, { a: undefined })

      await Util.assertions.decoding.fail(
        schema,
        null,
        `Expected { readonly a?: number | undefined }, actual null`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: "a" },
        `{ readonly a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
      await Util.assertions.decoding.fail(
        schema,
        { a: 1, b: "b" },
        `{ readonly a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("should not add optional keys", async () => {
      const schema = S.Struct({
        a: S.optionalWith(S.String, { exact: true }),
        b: S.optionalWith(S.Number, { exact: true })
      })
      await Util.assertions.decoding.succeed(schema, {})
    })
  })

  describe("encoding", () => {
    it("empty", async () => {
      const schema = S.Struct({})
      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
      await Util.assertions.encoding.succeed(schema, [], [])

      await Util.assertions.encoding.fail(
        schema,
        null as any,
        `Expected {}, actual null`
      )
    })

    it("required property signature", async () => {
      const schema = S.Struct({ a: S.Number })
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
      await Util.assertions.encoding.fail(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("required property signature with undefined", async () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
      await Util.assertions.encoding.succeed(schema, { a: undefined }, { a: undefined })
      await Util.assertions.encoding.fail(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("exact optional property signature", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Number, { exact: true }) })
      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
      await Util.assertions.encoding.fail(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a?: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("exact optional property signature with undefined", async () => {
      const schema = S.Struct({ a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true }) })
      await Util.assertions.encoding.succeed(schema, {}, {})
      await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
      await Util.assertions.encoding.succeed(schema, { a: undefined }, { a: undefined })
      await Util.assertions.encoding.fail(
        schema,
        { a: 1, b: "b" } as any,
        `{ readonly a?: number | undefined }
└─ ["b"]
   └─ is unexpected, expected: "a"`,
        { parseOptions: Util.onExcessPropertyError }
      )
    })

    it("should handle symbols as keys", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const schema = S.Struct({ [a]: S.String })
      await Util.assertions.encoding.succeed(schema, { [a]: "a" }, { [a]: "a" })
    })
  })
})
