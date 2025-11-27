import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import * as A from "effect/Arbitrary"
import type * as array_ from "effect/Array"
import * as fc from "effect/FastCheck"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../../TestUtils.js"

type TemplateLiteralParameter = S.Schema.AnyNoContext | AST.LiteralValue

const expectPattern = (
  params: array_.NonEmptyReadonlyArray<TemplateLiteralParameter>,
  expectedPattern: string
) => {
  const ast = S.TemplateLiteral(...params).ast as AST.TemplateLiteral
  strictEqual(AST.getTemplateLiteralRegExp(ast).source, expectedPattern)
}

const expectAST = (
  params: array_.NonEmptyReadonlyArray<TemplateLiteralParameter>,
  expectedAST: AST.TemplateLiteral,
  expectedString: string
) => {
  const ast = S.TemplateLiteral(...params).ast
  deepStrictEqual(ast, expectedAST)
  strictEqual(String(ast), expectedString)
}

const expectProperty = <A>(
  schema: S.Schema<A>,
  params?: fc.Parameters<[A]>
) => {
  if (false as boolean) {
    const arb = A.make(schema)
    const is = S.is(schema)
    fc.assert(fc.property(arb, (i) => is(i)), params)
  }
}

describe("TemplateLiteral", () => {
  it("should throw on unsupported template literal spans", () => {
    throws(
      () => S.TemplateLiteral(S.Boolean),
      new Error(`Unsupported template literal span
schema (BooleanKeyword): boolean`)
    )

    throws(
      () => S.TemplateLiteral(S.Union(S.Boolean, S.SymbolFromSelf)),
      new Error(`Unsupported template literal span
schema (Union): boolean | symbol`)
    )
  })

  it("getTemplateLiteralRegExp", () => {
    expectPattern(["a"], "^a$")
    expectPattern(["a", "b"], "^ab$")
    expectPattern([S.Literal("a", "b"), "c"], "^(a|b)c$")
    expectPattern([S.Literal("a", "b"), "c", S.Literal("d", "e")], "^(a|b)c(d|e)$")
    expectPattern([S.Literal("a", "b"), S.String, S.Literal("d", "e")], "^(a|b)[\\s\\S]*?(d|e)$")
    expectPattern(["a", S.String], "^a[\\s\\S]*?$")
    expectPattern(["a", S.String, "b"], "^a[\\s\\S]*?b$")
    expectPattern(
      ["a", S.String, "b", S.Number],
      "^a[\\s\\S]*?b[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$"
    )
    expectPattern(["a", S.Number], "^a[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?$")
    expectPattern([S.String, "a"], "^[\\s\\S]*?a$")
    expectPattern([S.Number, "a"], "^[+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?a$")
    expectPattern(
      [S.Union(S.String, S.Literal(1)), S.Union(S.Number, S.Literal(true))],
      "^([\\s\\S]*?|1)([+-]?\\d*\\.?\\d+(?:[Ee][+-]?\\d+)?|true)$"
    )
    expectPattern([S.Union(S.Literal("a", "b"), S.Literal(1, 2))], "^(a|b|1|2)$")
    expectPattern(["c", S.Union(S.TemplateLiteral("a", S.String, "b"), S.Literal("e")), "d"], "^c(a[\\s\\S]*?b|e)d$")
    expectPattern(["<", S.TemplateLiteral("h", S.Literal(1, 2)), ">"], "^<h(1|2)>$")
    expectPattern(
      ["-", S.Union(S.TemplateLiteral("a", S.Literal("b", "c")), S.TemplateLiteral("d", S.Literal("e", "f")))],
      "^-(a(b|c)|d(e|f))$"
    )
  })

  describe("AST and toString", () => {
    it(`"a"`, () => {
      const expectedAST = new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(S.Literal("a").ast, "")])
      const expectedString = "`a`"
      expectAST([S.Literal("a")], expectedAST, expectedString)
      expectAST(["a"], expectedAST, expectedString)
    })

    it(`"a" + "b"`, () => {
      const expectedAST = new AST.TemplateLiteral("a", [new AST.TemplateLiteralSpan(S.Literal("b").ast, "")])
      const expectedString = "`ab`"
      expectAST([S.Literal("a"), S.Literal("b")], expectedAST, expectedString)
      expectAST(["a", "b"], expectedAST, expectedString)
    })

    it(`("a" | "b") + "c"`, () => {
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(S.Literal("a", "b").ast, "c")
      ])
      const expectedString = "`${\"a\" | \"b\"}c`"
      expectAST([S.Literal("a", "b"), S.Literal("c")], expectedAST, expectedString)
      expectAST([S.Literal("a", "b"), "c"], expectedAST, expectedString)
    })

    it(`("a" | "b) + "c" + ("d" | "e")`, () => {
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(S.Literal("a", "b").ast, "c"),
        new AST.TemplateLiteralSpan(S.Literal("d", "e").ast, "")
      ])
      const expectedString = "`${\"a\" | \"b\"}c${\"d\" | \"e\"}`"
      expectAST([S.Literal("a", "b"), S.Literal("c"), S.Literal("d", "e")], expectedAST, expectedString)
      expectAST([S.Literal("a", "b"), "c", S.Literal("d", "e")], expectedAST, expectedString)
    })

    it(`("a" | "b") + string + ("d" | "e")`, () => {
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(S.Literal("a", "b").ast, ""),
        new AST.TemplateLiteralSpan(S.String.ast, ""),
        new AST.TemplateLiteralSpan(S.Literal("d", "e").ast, "")
      ])
      const expectedString = "`${\"a\" | \"b\"}${string}${\"d\" | \"e\"}`"
      expectAST([S.Literal("a", "b"), S.String, S.Literal("d", "e")], expectedAST, expectedString)
    })

    it(`"a" + string`, () => {
      const expectedAST = new AST.TemplateLiteral("a", [new AST.TemplateLiteralSpan(AST.stringKeyword, "")])
      const expectedString = "`a${string}`"
      expectAST([S.Literal("a"), S.String], expectedAST, expectedString)
      expectAST(["a", S.String], expectedAST, expectedString)
    })

    it(`"a" + string + "b"`, () => {
      const expectedAST = new AST.TemplateLiteral("a", [
        new AST.TemplateLiteralSpan(AST.stringKeyword, "b")
      ])
      const expectedString = "`a${string}b`"
      expectAST([S.Literal("a"), S.String, S.Literal("b")], expectedAST, expectedString)
      expectAST(["a", S.String, "b"], expectedAST, expectedString)
    })

    it(`"a" + string + "b" + number`, () => {
      const expectedAST = new AST.TemplateLiteral("a", [
        new AST.TemplateLiteralSpan(AST.stringKeyword, "b"),
        new AST.TemplateLiteralSpan(AST.numberKeyword, "")
      ])
      const expectedString = "`a${string}b${number}`"
      expectAST([S.Literal("a"), S.String, S.Literal("b"), S.Number], expectedAST, expectedString)
      expectAST(["a", S.String, "b", S.Number], expectedAST, expectedString)
    })

    it(`"a" + number`, () => {
      const expectedAST = new AST.TemplateLiteral("a", [new AST.TemplateLiteralSpan(AST.numberKeyword, "")])
      const expectedString = "`a${number}`"
      expectAST([S.Literal("a"), S.Number], expectedAST, expectedString)
      expectAST(["a", S.Number], expectedAST, expectedString)
    })

    it(`string + "a"`, () => {
      const expectedAST = new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(AST.stringKeyword, "a")])
      const expectedString = "`${string}a`"
      expectAST([S.String, S.Literal("a")], expectedAST, expectedString)
      expectAST([S.String, "a"], expectedAST, expectedString)
    })

    it(`number + "a"`, () => {
      const expectedAST = new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(AST.numberKeyword, "a")])
      const expectedString = "`${number}a`"
      expectAST([S.Number, S.Literal("a")], expectedAST, expectedString)
      expectAST([S.Number, "a"], expectedAST, expectedString)
    })

    it(`(string | 1) + (number | true)`, () => {
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(S.Union(S.String, S.Literal(1)).ast, ""),
        new AST.TemplateLiteralSpan(S.Union(S.Number, S.Literal(true)).ast, "")
      ])
      const expectedString = "`${string | \"1\"}${number | \"true\"}`"
      expectAST([S.Union(S.String, S.Literal(1)), S.Union(S.Number, S.Literal(true))], expectedAST, expectedString)
    })

    it(`(("a" | "b") | "c")`, () => {
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(S.Union(S.Union(S.Literal("a"), S.Literal("b")), S.Literal("c")).ast, "")
      ])
      const expectedString = "`${\"a\" | \"b\" | \"c\"}`"
      expectAST([S.Union(S.Union(S.Literal("a"), S.Literal("b")), S.Literal("c"))], expectedAST, expectedString)
    })

    it("`${string}`", () => {
      const expectedAST = new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(S.String.ast, "")])
      const expectedString = "`${string}`"
      expectAST([S.String], expectedAST, expectedString)
    })

    it("`${number}`", () => {
      const expectedAST = new AST.TemplateLiteral("", [new AST.TemplateLiteralSpan(S.Number.ast, "")])
      const expectedString = "`${number}`"
      expectAST([S.Number], expectedAST, expectedString)
    })

    it("`${`${string}`}`", () => {
      const schema = S.TemplateLiteral(S.String)
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(schema.ast, "")
      ])
      const expectedString = "`${`${string}`}`"
      expectAST([schema], expectedAST, expectedString)
    })

    it("`${`${string}` | \"a\"}`", () => {
      const schema = S.Union(S.TemplateLiteral(S.String), S.Literal("a"))
      const expectedAST = new AST.TemplateLiteral("", [
        new AST.TemplateLiteralSpan(schema.ast, "")
      ])
      const expectedString = "`${`${string}` | \"a\"}`"
      expectAST([schema], expectedAST, expectedString)
    })
  })

  describe("decoding", () => {
    it(`"a"`, async () => {
      const schema = S.TemplateLiteral("a")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a")

      await Util.assertions.decoding.fail(schema, "ab", `Expected \`a\`, actual "ab"`)
      await Util.assertions.decoding.fail(schema, "", `Expected \`a\`, actual ""`)
      await Util.assertions.decoding.fail(schema, null, `Expected \`a\`, actual null`)
    })

    it(`"a b"`, async () => {
      const schema = S.TemplateLiteral("a", " ", "b")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a b")

      await Util.assertions.decoding.fail(schema, "a  b", `Expected \`a b\`, actual "a  b"`)
    })

    it(`"[" + string + "]"`, async () => {
      const schema = S.TemplateLiteral("[", S.String, "]")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "[a]")

      await Util.assertions.decoding.fail(schema, "a", "Expected `[${string}]`, actual \"a\"")
    })

    it(`"a" + string`, async () => {
      const schema = S.TemplateLiteral("a", S.String)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a")
      await Util.assertions.decoding.succeed(schema, "ab")

      await Util.assertions.decoding.fail(
        schema,
        null,
        "Expected `a${string}`, actual null"
      )
      await Util.assertions.decoding.fail(
        schema,
        "",
        "Expected `a${string}`, actual \"\""
      )
    })

    it(`"a" + number`, async () => {
      const schema = S.TemplateLiteral("a", S.Number)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a1")
      await Util.assertions.decoding.succeed(schema, "a1.2")

      await Util.assertions.decoding.succeed(schema, "a-1.401298464324817e-45")
      await Util.assertions.decoding.succeed(schema, "a1.401298464324817e-45")
      await Util.assertions.decoding.succeed(schema, "a+1.401298464324817e-45")
      await Util.assertions.decoding.succeed(schema, "a-1.401298464324817e+45")
      await Util.assertions.decoding.succeed(schema, "a1.401298464324817e+45")
      await Util.assertions.decoding.succeed(schema, "a+1.401298464324817e+45")

      await Util.assertions.decoding.succeed(schema, "a-1.401298464324817E-45")
      await Util.assertions.decoding.succeed(schema, "a1.401298464324817E-45")
      await Util.assertions.decoding.succeed(schema, "a+1.401298464324817E-45")
      await Util.assertions.decoding.succeed(schema, "a-1.401298464324817E+45")
      await Util.assertions.decoding.succeed(schema, "a1.401298464324817E+45")
      await Util.assertions.decoding.succeed(schema, "a+1.401298464324817E+45")

      await Util.assertions.decoding.fail(
        schema,
        null,
        "Expected `a${number}`, actual null"
      )
      await Util.assertions.decoding.fail(
        schema,
        "",
        "Expected `a${number}`, actual \"\""
      )
      await Util.assertions.decoding.fail(
        schema,
        "aa",
        "Expected `a${number}`, actual \"aa\""
      )
    })

    it(`string`, async () => {
      const schema = S.TemplateLiteral(S.String)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a")
      await Util.assertions.decoding.succeed(schema, "ab")
      await Util.assertions.decoding.succeed(schema, "")
      await Util.assertions.decoding.succeed(schema, "\n")
      await Util.assertions.decoding.succeed(schema, "\r")
      await Util.assertions.decoding.succeed(schema, "\r\n")
      await Util.assertions.decoding.succeed(schema, "\t")
    })

    it(`\\n + string`, async () => {
      const schema = S.TemplateLiteral("\n", S.String)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "\n")
      await Util.assertions.decoding.succeed(schema, "\na")
      await Util.assertions.decoding.fail(
        schema,
        "a",
        "Expected `\n${string}`, actual \"a\""
      )
    })

    it(`a\\nb  + string`, async () => {
      const schema = S.TemplateLiteral("a\nb ", S.String)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a\nb ")
      await Util.assertions.decoding.succeed(schema, "a\nb c")
    })

    it(`"a" + string + "b"`, async () => {
      const schema = S.TemplateLiteral("a", S.String, "b")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "ab")
      await Util.assertions.decoding.succeed(schema, "acb")
      await Util.assertions.decoding.succeed(schema, "abb")
      await Util.assertions.decoding.fail(
        schema,
        "",
        "Expected `a${string}b`, actual \"\""
      )
      await Util.assertions.decoding.fail(
        schema,
        "a",
        "Expected `a${string}b`, actual \"a\""
      )
      await Util.assertions.decoding.fail(
        schema,
        "b",
        "Expected `a${string}b`, actual \"b\""
      )
      await Util.assertions.encoding.succeed(schema, "acb", "acb")
    })

    it(`"a" + string + "b" + string`, async () => {
      const schema = S.TemplateLiteral("a", S.String, "b", S.String)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "ab")
      await Util.assertions.decoding.succeed(schema, "acb")
      await Util.assertions.decoding.succeed(schema, "acbd")

      await Util.assertions.decoding.fail(
        schema,
        "a",
        "Expected `a${string}b${string}`, actual \"a\""
      )
      await Util.assertions.decoding.fail(
        schema,
        "b",
        "Expected `a${string}b${string}`, actual \"b\""
      )
    })

    it("https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html", async () => {
      const EmailLocaleIDs = S.Literal("welcome_email", "email_heading")
      const FooterLocaleIDs = S.Literal("footer_title", "footer_sendoff")
      const schema = S.TemplateLiteral(S.Union(EmailLocaleIDs, FooterLocaleIDs), "_id")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "welcome_email_id")
      await Util.assertions.decoding.succeed(schema, "email_heading_id")
      await Util.assertions.decoding.succeed(schema, "footer_title_id")
      await Util.assertions.decoding.succeed(schema, "footer_sendoff_id")

      await Util.assertions.decoding.fail(
        schema,
        "_id",
        `Expected \`\${"welcome_email" | "email_heading" | "footer_title" | "footer_sendoff"}_id\`, actual "_id"`
      )
    })

    it(`string + 0`, async () => {
      const schema = S.TemplateLiteral(S.String, 0)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a0")
      await Util.assertions.decoding.fail(schema, "a", "Expected `${string}0`, actual \"a\"")
    })

    it(`string + true`, async () => {
      const schema = S.TemplateLiteral(S.String, true)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "atrue")
      await Util.assertions.decoding.fail(schema, "a", "Expected `${string}true`, actual \"a\"")
    })

    it(`string + null`, async () => {
      const schema = S.TemplateLiteral(S.String, null)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "anull")
      await Util.assertions.decoding.fail(schema, "a", "Expected `${string}null`, actual \"a\"")
    })

    it(`string + 1n`, async () => {
      const schema = S.TemplateLiteral(S.String, 1n)
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a1")
      await Util.assertions.decoding.fail(schema, "a", "Expected `${string}1`, actual \"a\"")
    })

    it(`string + ("a" | 0)`, async () => {
      const schema = S.TemplateLiteral(S.String, S.Literal("a", 0))
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "a0")
      await Util.assertions.decoding.succeed(schema, "aa")
      await Util.assertions.decoding.fail(
        schema,
        "b",
        `Expected \`\${string}\${"a" | "0"}\`, actual "b"`
      )
    })

    it(`(string | 1) + (number | true)`, async () => {
      const schema = S.TemplateLiteral(S.Union(S.String, S.Literal(1)), S.Union(S.Number, S.Literal(true)))
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "atrue")
      await Util.assertions.decoding.succeed(schema, "-2")
      await Util.assertions.decoding.succeed(schema, "10.1")
      await Util.assertions.decoding.fail(
        schema,
        "",
        `Expected \`\${string | "1"}\${number | "true"}\`, actual ""`
      )
    })

    it("`c${`a${string}b` | \"e\"}d`", async () => {
      const schema = S.TemplateLiteral(
        "c",
        S.Union(S.TemplateLiteral("a", S.String, "b"), S.Literal("e")),
        "d"
      )
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "ced")
      await Util.assertions.decoding.succeed(schema, "cabd")
      await Util.assertions.decoding.succeed(schema, "casbd")
      await Util.assertions.decoding.succeed(schema, "ca  bd")
      await Util.assertions.decoding.fail(
        schema,
        "",
        "Expected `c${`a${string}b` | \"e\"}d`, actual \"\""
      )
    })

    it("< + h + (1|2) + >", async () => {
      const schema = S.TemplateLiteral("<", S.TemplateLiteral("h", S.Literal(1, 2)), ">")
      expectProperty(schema)
      await Util.assertions.decoding.succeed(schema, "<h1>")
      await Util.assertions.decoding.succeed(schema, "<h2>")
      await Util.assertions.decoding.fail(schema, "<h3>", "Expected `<${`h${\"1\" | \"2\"}`}>`, actual \"<h3>\"")
    })
  })
})
