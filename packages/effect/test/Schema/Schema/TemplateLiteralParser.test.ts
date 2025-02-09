import type * as array_ from "effect/Array"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

type TemplateLiteralParameter = S.Schema.AnyNoContext | AST.LiteralValue

const expectPattern = (
  params: array_.NonEmptyReadonlyArray<TemplateLiteralParameter>,
  expectedPattern: string
) => {
  const ast = S.TemplateLiteral(...params).ast as AST.TemplateLiteral
  expect(AST.getTemplateLiteralCapturingRegExp(ast).source).toEqual(expectedPattern)
}

describe("TemplateLiteralParser", () => {
  it("should throw on unsupported template literal spans", () => {
    expect(() => S.TemplateLiteralParser(S.Boolean)).toThrow(
      new Error(`Unsupported template literal span
schema (BooleanKeyword): boolean`)
    )

    expect(() => S.TemplateLiteralParser(S.Union(S.Boolean, S.SymbolFromSelf))).toThrow(
      new Error(`Unsupported template literal span
schema (Union): boolean | symbol`)
    )
  })

  it("getTemplateLiteralCapturingRegExp", () => {
    expectPattern(["a"], "^(a)$")
    expectPattern(["a", "b"], "^(a)(b)$")
    expectPattern([S.Literal("a", "b"), "c"], "^(a|b)(c)$")
    expectPattern([S.Literal("a", "b"), "c", S.Literal("d", "e")], "^(a|b)(c)(d|e)$")
    expectPattern([S.Literal("a", "b"), S.String, S.Literal("d", "e")], "^(a|b)(.*)(d|e)$")
    expectPattern(["a", S.String], "^(a)(.*)$")
    expectPattern(["a", S.String, "b"], "^(a)(.*)(b)$")
    expectPattern(
      ["a", S.String, "b", S.Number],
      "^(a)(.*)(b)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)$"
    )
    expectPattern(["a", S.Number], "^(a)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)$")
    expectPattern([S.String, "a"], "^(.*)(a)$")
    expectPattern([S.Number, "a"], "^([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?)(a)$")
    expectPattern([
      S.Union(S.String, S.Literal(1)),
      S.Union(S.Number, S.Literal(true))
    ], "^(.*|1)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?|true)$")
    expectPattern([S.Union(S.Literal("a", "b"), S.Literal(1, 2))], "^(a|b|1|2)$")
    expectPattern([
      "c",
      S.Union(S.TemplateLiteral("a", S.String, "b"), S.Literal("e")),
      "d"
    ], "^(c)(a.*b|e)(d)$")
    expectPattern(["<", S.TemplateLiteral("h", S.Literal(1, 2)), ">"], "^(<)(h(?:1|2))(>)$")
    expectPattern(
      ["-", S.Union(S.TemplateLiteral("a", S.Literal("b", "c")), S.TemplateLiteral("d", S.Literal("e", "f")))],
      "^(-)(a(?:b|c)|d(?:e|f))$"
    )
  })

  it("should expose the params", () => {
    const params = ["/", S.Int, "/", S.String] as const
    const schema = S.TemplateLiteralParser(...params)
    expect(schema.params).toStrictEqual(params)
  })

  describe("decoding", () => {
    it(`"a"`, async () => {
      const schema = S.TemplateLiteralParser("a")

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
      const schema = S.TemplateLiteralParser("a", "b")

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
      const schema = S.TemplateLiteralParser(S.Int, "a")

      await Util.expectDecodeUnknownSuccess(schema, "1a", [1, "a"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1.1a",
        `(\`\${number}a\` <-> readonly [Int, "a"])
└─ Type side transformation failure
   └─ readonly [Int, "a"]
      └─ [0]
         └─ (NumberFromString <-> Int)
            └─ Type side transformation failure
               └─ Int
                  └─ Predicate refinement failure
                     └─ Expected an integer, actual 1.1`
      )

      await Util.expectEncodeSuccess(schema, [1, "a"], "1a")
      await Util.expectEncodeFailure(
        schema,
        [1.1, "a"],
        `(\`\${number}a\` <-> readonly [Int, "a"])
└─ Type side transformation failure
   └─ readonly [Int, "a"]
      └─ [0]
         └─ (NumberFromString <-> Int)
            └─ Type side transformation failure
               └─ Int
                  └─ Predicate refinement failure
                     └─ Expected an integer, actual 1.1`
      )
    })

    it(`NumberFromString + "a" + NonEmptyString`, async () => {
      const schema = S.TemplateLiteralParser(S.NumberFromString, "a", S.NonEmptyString)

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
               └─ Expected a non empty string, actual ""`
      )
    })

    it("1", async () => {
      const schema = S.TemplateLiteralParser(1)
      await Util.expectDecodeUnknownSuccess(schema, "1", [1])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1a",
        `(\`1\` <-> readonly [1])
└─ Encoded side transformation failure
   └─ Expected \`1\`, actual "1a"`
      )
    })

    it("Literal(1)", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(1))
      await Util.expectDecodeUnknownSuccess(schema, "1", [1])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1a",
        `(\`1\` <-> readonly [1])
└─ Encoded side transformation failure
   └─ Expected \`1\`, actual "1a"`
      )
    })

    it("1n", async () => {
      const schema = S.TemplateLiteralParser(1n)
      await Util.expectDecodeUnknownSuccess(schema, "1", [1n])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1a",
        `(\`1\` <-> readonly [1n])
└─ Encoded side transformation failure
   └─ Expected \`1\`, actual "1a"`
      )
    })

    it("Literal(1n)", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(1n))
      await Util.expectDecodeUnknownSuccess(schema, "1", [1n])
      await Util.expectDecodeUnknownFailure(
        schema,
        "1a",
        `(\`1\` <-> readonly [1n])
└─ Encoded side transformation failure
   └─ Expected \`1\`, actual "1a"`
      )
    })

    it("true", async () => {
      const schema = S.TemplateLiteralParser(true)
      await Util.expectDecodeUnknownSuccess(schema, "true", [true])
      await Util.expectDecodeUnknownFailure(
        schema,
        "truea",
        `(\`true\` <-> readonly [true])
└─ Encoded side transformation failure
   └─ Expected \`true\`, actual "truea"`
      )
    })

    it("Literal(true)", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(true))
      await Util.expectDecodeUnknownSuccess(schema, "true", [true])
      await Util.expectDecodeUnknownFailure(
        schema,
        "truea",
        `(\`true\` <-> readonly [true])
└─ Encoded side transformation failure
   └─ Expected \`true\`, actual "truea"`
      )
    })

    it("false", async () => {
      const schema = S.TemplateLiteralParser(false)
      await Util.expectDecodeUnknownSuccess(schema, "false", [false])
      await Util.expectDecodeUnknownFailure(
        schema,
        "falsea",
        `(\`false\` <-> readonly [false])
└─ Encoded side transformation failure
   └─ Expected \`false\`, actual "falsea"`
      )
    })

    it("Literal(false)", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(false))
      await Util.expectDecodeUnknownSuccess(schema, "false", [false])
      await Util.expectDecodeUnknownFailure(
        schema,
        "falsea",
        `(\`false\` <-> readonly [false])
└─ Encoded side transformation failure
   └─ Expected \`false\`, actual "falsea"`
      )
    })

    it("null", async () => {
      const schema = S.TemplateLiteralParser(null)
      await Util.expectDecodeUnknownSuccess(schema, "null", [null])
      await Util.expectDecodeUnknownFailure(
        schema,
        "nulla",
        `(\`null\` <-> readonly [null])
└─ Encoded side transformation failure
   └─ Expected \`null\`, actual "nulla"`
      )
    })

    it("Literal(null)", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(null))
      await Util.expectDecodeUnknownSuccess(schema, "null", [null])
      await Util.expectDecodeUnknownFailure(
        schema,
        "nulla",
        `(\`null\` <-> readonly [null])
└─ Encoded side transformation failure
   └─ Expected \`null\`, actual "nulla"`
      )
    })

    it("1 | 2", async () => {
      const schema = S.TemplateLiteralParser(S.Literal(1, 2))
      await Util.expectDecodeUnknownSuccess(schema, "1", [1])
      await Util.expectDecodeUnknownSuccess(schema, "2", [2])
    })

    it(`"h" + (1 | 2 | 3)`, async () => {
      const schema = S.TemplateLiteralParser("h", S.Literal(1, 2, 3))
      await Util.expectDecodeUnknownSuccess(schema, "h1", ["h", 1])
    })

    it(`"c" + (\`a\${string}b\`|"e") + "d"`, async () => {
      const schema = S.TemplateLiteralParser(
        "c",
        S.Union(S.TemplateLiteralParser("a", S.NonEmptyString, "b"), S.Literal("e")),
        "d"
      )
      await Util.expectDecodeUnknownSuccess(schema, "ca bd", ["c", ["a", " ", "b"], "d"])
      await Util.expectDecodeUnknownSuccess(schema, "ced", ["c", "e", "d"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "cabd",
        `(\`c\${\`a\${string}b\` | "e"}d\` <-> readonly ["c", (\`a\${string}b\` <-> readonly ["a", NonEmptyString, "b"]) | "e", "d"])
└─ Type side transformation failure
   └─ readonly ["c", (\`a\${string}b\` <-> readonly ["a", NonEmptyString, "b"]) | "e", "d"]
      └─ [1]
         └─ (\`a\${string}b\` <-> readonly ["a", NonEmptyString, "b"]) | "e"
            ├─ (\`a\${string}b\` <-> readonly ["a", NonEmptyString, "b"])
            │  └─ Type side transformation failure
            │     └─ readonly ["a", NonEmptyString, "b"]
            │        └─ [1]
            │           └─ NonEmptyString
            │              └─ Predicate refinement failure
            │                 └─ Expected a non empty string, actual ""
            └─ Expected "e", actual "ab"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "ed",
        `(\`c\${\`a\${string}b\` | "e"}d\` <-> readonly ["c", (\`a\${string}b\` <-> readonly ["a", NonEmptyString, "b"]) | "e", "d"])
└─ Encoded side transformation failure
   └─ Expected \`c\${\`a\${string}b\` | "e"}d\`, actual "ed"`
      )
    })

    it(`"c" + (\`a\${number}b\`|"e") + "d"`, async () => {
      const schema = S.TemplateLiteralParser(
        "c",
        S.Union(S.TemplateLiteralParser("a", S.Int, "b"), S.Literal("e")),
        "d"
      )
      await Util.expectDecodeUnknownSuccess(schema, "ced", ["c", "e", "d"])
      await Util.expectDecodeUnknownSuccess(schema, "ca1bd", ["c", ["a", 1, "b"], "d"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "ca1.1bd",
        `(\`c\${\`a\${number}b\` | "e"}d\` <-> readonly ["c", (\`a\${number}b\` <-> readonly ["a", Int, "b"]) | "e", "d"])
└─ Type side transformation failure
   └─ readonly ["c", (\`a\${number}b\` <-> readonly ["a", Int, "b"]) | "e", "d"]
      └─ [1]
         └─ (\`a\${number}b\` <-> readonly ["a", Int, "b"]) | "e"
            ├─ (\`a\${number}b\` <-> readonly ["a", Int, "b"])
            │  └─ Type side transformation failure
            │     └─ readonly ["a", Int, "b"]
            │        └─ [1]
            │           └─ (NumberFromString <-> Int)
            │              └─ Type side transformation failure
            │                 └─ Int
            │                    └─ Predicate refinement failure
            │                       └─ Expected an integer, actual 1.1
            └─ Expected "e", actual "a1.1b"`
      )
      await Util.expectDecodeUnknownFailure(
        schema,
        "ca-bd",
        `(\`c\${\`a\${number}b\` | "e"}d\` <-> readonly ["c", (\`a\${number}b\` <-> readonly ["a", Int, "b"]) | "e", "d"])
└─ Encoded side transformation failure
   └─ Expected \`c\${\`a\${number}b\` | "e"}d\`, actual "ca-bd"`
      )
    })

    it("(`<${`h${\"1\" | \"2\"}`}>` <-> readonly [\"<\", `h${\"1\" | \"2\"}`, \">\"])", async () => {
      const schema = S.TemplateLiteralParser("<", S.TemplateLiteral("h", S.Literal(1, 2)), ">")
      await Util.expectDecodeUnknownSuccess(schema, "<h1>", ["<", "h1", ">"])
      await Util.expectDecodeUnknownSuccess(schema, "<h2>", ["<", "h2", ">"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "<h3>",
        `(\`<\${\`h\${"1" | "2"}\`}>\` <-> readonly ["<", \`h\${"1" | "2"}\`, ">"])
└─ Encoded side transformation failure
   └─ Expected \`<\${\`h\${"1" | "2"}\`}>\`, actual "<h3>"`
      )
    })

    it("(`<${`h${\"1\" | \"2\"}`}>` <-> readonly [\"<\", `h${\"1\" | \"2\"}`, \">\"])", async () => {
      const schema = S.TemplateLiteralParser("<", S.TemplateLiteralParser("h", S.Literal(1, 2)), ">")
      await Util.expectDecodeUnknownSuccess(schema, "<h1>", ["<", ["h", 1], ">"])
      await Util.expectDecodeUnknownSuccess(schema, "<h2>", ["<", ["h", 2], ">"])
      await Util.expectDecodeUnknownFailure(
        schema,
        "<h3>",
        `(\`<\${\`h\${"1" | "2"}\`}>\` <-> readonly ["<", (\`h\${"1" | "2"}\` <-> readonly ["h", 1 | 2]), ">"])
└─ Encoded side transformation failure
   └─ Expected \`<\${\`h\${"1" | "2"}\`}>\`, actual "<h3>"`
      )
    })
  })
})
