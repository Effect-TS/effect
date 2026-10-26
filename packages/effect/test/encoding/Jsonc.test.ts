import { assert, describe, it } from "@effect/vitest"
import { Json5, Jsonc } from "effect/encoding"

describe("Jsonc", () => {
  it("accepts comments wherever JSON accepts whitespace", () => {
    assert.deepStrictEqual(
      Jsonc.parse(`/* before */ {
      // property
      "a" /* key */ : /* value */ [1, /* item */ true, null],
      "nested": {"value": "ok"} /* end */
    } // after`),
      { a: [1, true, null], nested: { value: "ok" } }
    )
    assert.strictEqual(Jsonc.parse("1 // comment at EOF"), 1)
    assert.deepStrictEqual(Jsonc.parse("/* first\r\nsecond */ [/* third\nfourth */ 1]"), [1])
    for (const separator of ["\u2028", "\u2029"]) {
      assert.strictEqual(Jsonc.parse("// comment" + separator + "still comment\ntrue"), true)
    }
    for (const ending of ["\n", "\r", "\r\n"]) {
      assert.strictEqual(Jsonc.parse("// comment" + ending + "true"), true)
    }
  })

  it("matches JSON.parse for JSON values, strings, and numbers", () => {
    for (
      const input of [
        "null",
        "true",
        "false",
        "[]",
        "{}",
        "-0",
        "1e400",
        "1E-3",
        "[0,-12.25,1e+2,\"text\",null,false]",
        String
          .raw`{"url":"https://example.com/a/*b*/", "quote":"\"//still a string", "slashes":"\\\\", "escapes":"\b\f\n\r\t\/\u0041"}`,
        "\"\u2028\u2029\"",
        "{\"__proto__\":{\"polluted\":true},\"constructor\":1,\"a\":1,\"a\":2}"
      ]
    ) {
      assert.deepStrictEqual(Jsonc.parse(input), JSON.parse(input))
    }
  })

  it("does not confuse escaped backslashes with escaped quotes", () => {
    assert.deepStrictEqual(Jsonc.parse(String.raw`["\\",/* comment */"\"/* text */"]`), ["\\", "\"/* text */"])
  })

  it("rejects JSON5-only syntax accepted by Json5", () => {
    for (
      const input of [
        "{unquoted: 1}",
        "{'single': 1}",
        "{\"a\":1,}",
        "[1,]",
        "[1,/* end */]",
        "+1",
        ".5",
        "5.",
        "0x1f",
        "-0Xf",
        "NaN",
        "Infinity",
        "-Infinity",
        String.raw`"\x41"`,
        String.raw`"\v"`,
        String.raw`"\0"`,
        String.raw`"\a"`,
        "\"line\\\nbreak\"",
        "\u00a0{}",
        "\uFEFF{}",
        "\v{}",
        "\f{}",
        "\u2028{}"
      ]
    ) {
      Json5.parse(input)
      assert.throws(() => Jsonc.parse(input), SyntaxError)
    }
  })

  it("rejects malformed JSON, incomplete comments, and comments splitting tokens", () => {
    for (
      const input of [
        "",
        "// only a comment",
        "/* only a comment */",
        "{} /* unterminated",
        "{} /",
        "{} */",
        "/* nested /* */ */ {}",
        "true false",
        "[1,,2]",
        "[,]",
        "{\"a\":}",
        "{\"a\" 1}",
        "{\"a\":1 \"b\":2}",
        "[1 2]",
        "01",
        "-01",
        "1e+",
        "--1",
        "\"unterminated",
        "\"raw\nnewline\"",
        "\"raw\ttab\"",
        "\"\u0000\"",
        String.raw`"\uZZZZ"`,
        "1/* gap */2",
        "tr/* gap */ue",
        "-/* gap */1",
        "1/* gap */.5",
        "1e/* gap */2",
        "{\"a\": hidden}",
        "\"unfinished\\\" // not a comment"
      ]
    ) {
      assert.throws(() => Jsonc.parse(input), SyntaxError)
    }
    assert.throws(() => Jsonc.parse("{\"secret\": hidden}"), /^Invalid JSONC$/)
  })
})
