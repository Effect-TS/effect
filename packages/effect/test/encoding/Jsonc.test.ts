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
  })

  it.each([
    ["line separator", "\u2028"],
    ["paragraph separator", "\u2029"]
  ])("keeps %s inside a line comment", (_, separator) => {
    assert.strictEqual(Jsonc.parse("// comment" + separator + "still comment\ntrue"), true)
  })

  it.each([
    ["LF", "\n"],
    ["CR", "\r"],
    ["CRLF", "\r\n"]
  ])("ends a line comment at %s", (_, ending) => {
    assert.strictEqual(Jsonc.parse("// comment" + ending + "true"), true)
  })

  it.each([
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
  ])("matches JSON.parse for %j", (input) => {
    assert.deepStrictEqual(Jsonc.parse(input), JSON.parse(input))
  })

  it("does not confuse escaped backslashes with escaped quotes", () => {
    assert.deepStrictEqual(Jsonc.parse(String.raw`["\\",/* comment */"\"/* text */"]`), ["\\", "\"/* text */"])
  })

  it.each([
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
  ])("rejects JSON5-only syntax %j", (input) => {
    Json5.parse(input)
    assert.throws(() => Jsonc.parse(input), SyntaxError)
  })

  it.each([
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
  ])("rejects malformed JSONC %j", (input) => {
    assert.throws(() => Jsonc.parse(input), SyntaxError)
  })

  it("does not include input text in syntax errors", () => {
    assert.throws(() => Jsonc.parse("{\"secret\": hidden}"), /^Invalid JSONC at line 1, column 12$/)
  })

  it.each(
    [
      ["unexpected value after a line comment", "{\n  // note\n  \"a\": hidden\n}", 3, 8],
      ["earlier invalid token before an unterminated comment", "? /* unterminated", 1, 1],
      ["earlier invalid value before an unterminated comment", "{\"a\": ?}\n/* unterminated", 1, 7],
      ["completed multiline comment", "/* first\nsecond */\n?", 3, 1],
      ["missing colon", "{\"a\" 1}", 1, 6],
      ["missing value", "{\"a\":}", 1, 6],
      ["trailing object comma", "{\"a\": 1,}", 1, 9],
      ["trailing array comma", "[1, /* note */]", 1, 15],
      ["leading comma", "[,1]", 1, 2],
      ["invalid escape", String.raw`{"a":"\q"}`, 1, 8],
      ["incomplete Unicode escape", String.raw`"\u12"`, 1, 6],
      ["unterminated string", "{\"a\":\"secret", 1, 13],
      ["unterminated block comment", "{\n/* secret", 2, 10],
      ["CRLF line endings", "{\r\n  \"a\": hidden\r\n}", 2, 8],
      ["CR line endings", "{\r  \"a\": hidden\r}", 2, 8],
      ["UTF-16 columns after an astral character", "{\"emoji\":\"😀\",\"a\":?}", 1, 19],
      ["Unicode separators inside a line comment", "//\u2028\u2029comment\n?", 2, 1],
      ["BOM", "\uFEFF{}", 1, 1],
      ["trailing content after a block comment", "{}\n/* comment */ hidden", 2, 15],
      ["comment splitting a number", "1/* xx\n */2", 2, 4],
      ["empty input", "", 1, 1],
      ["incomplete array", "[1,\n", 2, 1],
      ["single-quoted string", "['secret']", 1, 2],
      ["unquoted key", "{secret: 1}", 1, 2],
      ["JSON5 number", "{\"a\": +1}", 1, 7],
      ["hexadecimal number", "0x1", 1, 2],
      ["incomplete exponent", "1e+", 1, 2],
      ["leading zero", "01", 1, 2]
    ] as const
  )("reports the original position for %s", (_, input, line, column) => {
    assert.throws(() => Jsonc.parse(input), SyntaxError, `Invalid JSONC at line ${line}, column ${column}`)
  })

  it("locates errors beyond the JavaScript call-stack limit", () => {
    const prefix = "[".repeat(10_000)
    assert.throws(() => Jsonc.parse(prefix + "?"), SyntaxError, "Invalid JSONC at line 1, column 10001")
    const complete = prefix + "0" + "]".repeat(10_000)
    let value: unknown = Jsonc.parse(complete)
    for (let i = 0; i < 10_000; i++) value = (value as Array<unknown>)[0]
    assert.strictEqual(value, 0)
  })
})
