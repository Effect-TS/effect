import type * as array_ from "effect/Array"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

type TemplateLiteralParameter = Schema.Schema.AnyNoContext | AST.LiteralValue

const expectCapturingPattern = (
  params: array_.NonEmptyReadonlyArray<TemplateLiteralParameter>,
  expectedPattern: string
) => {
  const ast = Schema.TemplateLiteral(...params).ast as AST.TemplateLiteral
  expect(AST.getTemplateLiteralCapturingRegExp(ast).source).toEqual(expectedPattern)
}

describe("TemplateLiteralParser", () => {
  it("should throw on unsupported template literal spans", () => {
    expect(() => Schema.TemplateLiteralParser(Schema.Boolean)).toThrow(
      new Error(`Unsupported template literal span
schema (BooleanKeyword): boolean`)
    )

    expect(() => Schema.TemplateLiteralParser(Schema.Union(Schema.Boolean, Schema.SymbolFromSelf))).toThrow(
      new Error(`Unsupported template literal span
schema (Union): boolean | symbol`)
    )
  })

  describe("getTemplateLiteralCapturingRegExp", () => {
    it(`"a"`, () => {
      expectCapturingPattern(["a"], "^(a)$")
    })

    it(`"a" + "b"`, () => {
      expectCapturingPattern(["a", "b"], "^(a)(b)$")
    })

    it(`("a" | "b") + "c"`, () => {
      expectCapturingPattern([Schema.Literal("a", "b"), "c"], "^(a|b)(c)$")
    })

    it(`("a" | "b) + "c" + ("d" | "e")`, () => {
      expectCapturingPattern([Schema.Literal("a", "b"), "c", Schema.Literal("d", "e")], "^(a|b)(c)(d|e)$")
    })

    it(`("a" | "b") + string + ("d" | "e")`, () => {
      expectCapturingPattern([Schema.Literal("a", "b"), Schema.String, Schema.Literal("d", "e")], "^(a|b)(.*)(d|e)$")
    })

    it(`"a" + string`, () => {
      expectCapturingPattern(["a", Schema.String], "^(a)(.*)$")
    })

    it(`"a" + string + "b"`, () => {
      expectCapturingPattern(["a", Schema.String, "b"], "^(a)(.*)(b)$")
    })

    it(`"a" + string + "b" + number`, () => {
      expectCapturingPattern(
        ["a", Schema.String, "b", Schema.Number],
        "^(a)(.*)(b)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)$"
      )
    })

    it(`"a" + number`, () => {
      expectCapturingPattern(["a", Schema.Number], "^(a)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)$")
    })

    it(`string + "a"`, () => {
      expectCapturingPattern([Schema.String, "a"], "^(.*)(a)$")
    })

    it(`number + "a"`, () => {
      expectCapturingPattern([Schema.Number, "a"], "^([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)(a)$")
    })

    it(`(string | 1) + (number | true)`, () => {
      expectCapturingPattern([
        Schema.Union(Schema.String, Schema.Literal(1)),
        Schema.Union(Schema.Number, Schema.Literal(true))
      ], "^(.*|1)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?|true)$")
    })

    it(`(("a" | "b") | "c")`, () => {
      expectCapturingPattern([
        Schema.Union(Schema.Union(Schema.Literal("a"), Schema.Literal("b")), Schema.Literal("c"))
      ], "^(a|b|c)$")
    })
  })

  it("should expose the params", () => {
    const params = ["/", Schema.Int, "/", Schema.String] as const
    const schema = Schema.TemplateLiteralParser(...params)
    expect(schema.params).toStrictEqual(params)
  })

  describe("decoding", () => {
    it(`"a"`, async () => {
      const schema = Schema.TemplateLiteralParser("a")

      await Util.expectDecodeUnknownSuccess(schema, "a", ["a"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "",
        `(\`a\` <-> readonly ["a"])
└─ Encoded side transformation failure
   └─ Expected \`a\`, actual ""`
      )

      await Util.expectEncodeSuccess(schema, ["a"], "a")
    })

    it(`"a" + "b"`, async () => {
      const schema = Schema.TemplateLiteralParser("a", "b")

      await Util.expectDecodeUnknownSuccess(schema, "ab", ["a", "b"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "a",
        `(\`ab\` <-> readonly ["a", "b"])
└─ Encoded side transformation failure
   └─ Expected \`ab\`, actual "a"`
      )

      await Util.expectEncodeSuccess(schema, ["a", "b"], "ab")
    })

    it(`Int + "a"`, async () => {
      const schema = Schema.TemplateLiteralParser(Schema.Int, "a")

      await Util.expectDecodeUnknownSuccess(schema, "1a", [1, "a"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1.1a",
        `(\`\${number}a\` <-> readonly [Int, "a"])
└─ Type side transformation failure
   └─ readonly [Int, "a"]
      └─ [0]
         └─ Int
            └─ Predicate refinement failure
               └─ Expected Int, actual 1.1`
      )

      await Util.expectEncodeSuccess(schema, [1, "a"], "1a")
      await Util.expectEncodeFailure(
        schema,
        [1.1, "a"],
        `(\`\${number}a\` <-> readonly [Int, "a"])
└─ Type side transformation failure
   └─ readonly [Int, "a"]
      └─ [0]
         └─ Int
            └─ Predicate refinement failure
               └─ Expected Int, actual 1.1`
      )
    })

    it(`NumberFromString + "a" + NonEmptyString`, async () => {
      const schema = Schema.TemplateLiteralParser(Schema.NumberFromString, "a", Schema.NonEmptyString)

      await Util.expectDecodeUnknownSuccess(schema, "100ab", [100, "a", "b"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "-ab",
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", NonEmptyString])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", NonEmptyString]
      └─ [0]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "-"`
      )

      await Util.expectEncodeSuccess(schema, [100, "a", "b"], "100ab")
      await Util.expectEncodeFailure(
        schema,
        [100, "a", ""],
        `(\`\${string}a\${string}\` <-> readonly [NumberFromString, "a", NonEmptyString])
└─ Type side transformation failure
   └─ readonly [NumberFromString, "a", NonEmptyString]
      └─ [2]
         └─ NonEmptyString
            └─ Predicate refinement failure
               └─ Expected NonEmptyString, actual ""`
      )
    })
  })

  it("1", async () => {
    const schema = Schema.TemplateLiteralParser(1)
    await Util.expectDecodeUnknownSuccess(schema, "1", [1])
  })

  it("1n", async () => {
    const schema = Schema.TemplateLiteralParser(1n)
    await Util.expectDecodeUnknownSuccess(schema, "1", [1n])
  })

  it("true", async () => {
    const schema = Schema.TemplateLiteralParser(true)
    await Util.expectDecodeUnknownSuccess(schema, "true", [true])
  })

  it("false", async () => {
    const schema = Schema.TemplateLiteralParser(false)
    await Util.expectDecodeUnknownSuccess(schema, "false", [false])
  })

  it("null", async () => {
    const schema = Schema.TemplateLiteralParser(null)
    await Util.expectDecodeUnknownSuccess(schema, "null", [null])
  })
})
