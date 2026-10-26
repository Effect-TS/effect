import { assert, describe, it } from "@effect/vitest"
import * as Json5 from "effect/encoding/Json5"
import { jsonFixtures } from "./fixtures/json.ts"

const lineEndings = [
  ["LF", "\n"],
  ["CR", "\r"],
  ["CRLF", "\r\n"],
  ["line separator", "\u2028"],
  ["paragraph separator", "\u2029"]
] as const

describe("Json5", () => {
  it.each(jsonFixtures)("reference compatibility: $name", ({ input, json5: expected }) => {
    if (expected.valid) {
      assert.deepStrictEqual(Json5.parse(input), expected.value)
    } else {
      assert.throws(() => Json5.parse(input), SyntaxError, /^Invalid JSON5 at line \d+, column \d+$/)
    }
  })

  it("parses JSON5, which includes JSONC and JSON", () => {
    const text = `// comment
{ unquoted: 1, 'single': 'it\\'s', "double": "a\\/b", trailing: [1, 2,], hex: -0x1F,
  frac: .5, point: 5., plus: +1, exp: 1e3, esc: '\\x41\\u00e9\\0\\v', continued: 'a\\
b', \\u0061b: 1, café: true, nil: null, /* block */ }`
    assert.deepStrictEqual(Json5.parse(text), {
      unquoted: 1,
      single: "it's",
      double: "a/b",
      trailing: [1, 2],
      hex: -31,
      frac: 0.5,
      point: 5,
      plus: 1,
      exp: 1000,
      esc: "Aé\0\v",
      continued: "ab",
      ab: 1,
      café: true,
      nil: null
    })

    assert.deepStrictEqual(Json5.parse("[NaN, -Infinity]"), [NaN, -Infinity])
  })

  it("keeps __proto__ as data and lets the last duplicate key win", () => {
    const value = Json5.parse("{\"__proto__\": 1, a: 1, b: 0, a: 2}") as object
    assert.deepStrictEqual(Object.keys(value), ["__proto__", "a", "b"])
    assert.strictEqual(Object.getPrototypeOf(value), Object.prototype)
    assert.strictEqual((value as Record<string, unknown>).a, 2)
  })

  it("accepts JSON primitives, JSON5 whitespace, and Unicode identifiers", () => {
    assert.deepStrictEqual(Json5.parse("[null, true, false, {}, [], 1e3, -2.5E-2]"), [
      null,
      true,
      false,
      {},
      [],
      1000,
      -0.025
    ])
    assert.deepStrictEqual(Json5.parse("\uFEFF\v\f\u00a0\u2028{ $: 1, _: 2, café: 3, 𐐀: 4 }\u2029"), {
      $: 1,
      _: 2,
      café: 3,
      𐐀: 4
    })
    assert.strictEqual(Json5.parse("// comment at EOF\n42 // end"), 42)

    assert.strictEqual(Json5.parse(String.raw`"\'\a\/\\\""`), "'a/\\\"")
  })

  it.each(lineEndings)("accepts line continuations and comments terminated by %s", (_, ending) => {
    assert.strictEqual(Json5.parse("'a\\" + ending + "b'"), "ab")
    assert.deepStrictEqual(Json5.parse("// comment" + ending + "{}"), {})
  })

  it.each([
    "",
    "/* comment */",
    "[,1]",
    "{,}",
    "{a:}",
    "{a 1}",
    "{a:1 b:2}",
    "[1 2]",
    "[1",
    "{",
    "null true",
    "undefined",
    "-01",
    "0x",
    "0xg",
    ".",
    ".e1",
    "1e+",
    "--1",
    "'unterminated",
    "'line\nbreak'",
    "'line\rbreak'",
    String.raw`'\01'`,
    String.raw`'\1'`,
    String.raw`'\uZZZZ'`,
    String.raw`'\xZ0'`,
    String.raw`{\u0030a: 1}`,
    String.raw`{a\x62: 1}`,
    "{a: hidden}",
    "{} /",
    "{} garbage"
  ])("rejects malformed JSON5 %j", (input) => {
    assert.throws(() => Json5.parse(input), SyntaxError, /Invalid JSON5 at line \d+, column \d+/)
  })

  it("does not include input text in syntax errors", () => {
    assert.throws(() => Json5.parse("{a: hidden}"), /^Invalid JSON5 at line 1, column 5$/)
  })

  it.each(lineEndings)("reports positions across %s line endings", (_, ending) => {
    assert.throws(() => Json5.parse("{" + ending + "  a: hidden}"), /line 2, column 6$/)
  })
})
