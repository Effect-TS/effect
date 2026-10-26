import { assert, describe, it } from "@effect/vitest"
import * as Json5 from "effect/encoding/Json5"

describe("Json5", () => {
  it("parses JSON5 syntax", () => {
    const input = `// comment
{ unquoted: 1, 'single': 'it\\'s', "double": "a\\/b", trailing: [1, 2,], hex: -0x1F,
  frac: .5, point: 5., plus: +1, exp: 1e3, esc: '\\x41\\u00e9\\0\\v', continued: 'a\\
b', \\u0061b: 1, a\\u0062c: 2, café: true, 𐐀: 2, $_: null, /* block */ }`
    assert.deepStrictEqual(Json5.parse(input), {
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
      abc: 2,
      café: true,
      𐐀: 2,
      $_: null
    })
    assert.deepStrictEqual(Json5.parse("﻿\v\f  [NaN, -Infinity] // end"), [NaN, -Infinity])
  })

  it("keeps __proto__ as data and lets the last duplicate key win", () => {
    const value = Json5.parse("{\"__proto__\": 1, a: 1, b: 0, a: 2}") as object
    assert.deepStrictEqual(Object.keys(value), ["__proto__", "a", "b"])
    assert.strictEqual(Object.getPrototypeOf(value), Object.prototype)
    assert.strictEqual((value as Record<string, unknown>).a, 2)
  })

  it.each([
    ["LF", "\n"],
    ["CR", "\r"],
    ["CRLF", "\r\n"],
    ["line separator", " "],
    ["paragraph separator", " "]
  ])("handles %s line endings", (_, ending) => {
    assert.strictEqual(Json5.parse("'a\\" + ending + "b'"), "ab")
    assert.deepStrictEqual(Json5.parse("// comment" + ending + "{}"), {})
    assert.throws(() => Json5.parse("{" + ending + "  a: hidden}"), /line 2, column 6$/)
  })

  it.each([
    "",
    "/* comment */",
    "[,1]",
    "[1,,]",
    "{a:1 b:2}",
    "[1",
    "null true",
    "-01",
    "0x",
    "1e+",
    "1/* gap */2",
    "'line\nbreak'",
    String.raw`'\1'`,
    String.raw`'\uZZZZ'`,
    String.raw`{0a: 1}`,
    "{} /* unterminated"
  ])("rejects malformed JSON5 %j without quoting it", (input) => {
    assert.throws(() => Json5.parse(input), SyntaxError, /^Invalid JSON5 at line \d+, column \d+$/)
  })

  it("parses and locates errors beyond the JavaScript call-stack limit", () => {
    const prefix = "[".repeat(10_000)
    let value = Json5.parse(prefix + "0" + "]".repeat(10_000))
    for (let i = 0; i < 10_000; i++) value = (value as Array<unknown>)[0]
    assert.strictEqual(value, 0)
    assert.throws(() => Json5.parse(prefix + "?"), SyntaxError, "Invalid JSON5 at line 1, column 10001")
  })
})
