import { assert, describe, it } from "@effect/vitest"
import * as Toml from "effect/encoding/Toml"

describe("Toml", () => {
  it("parses tables, dotted keys, arrays, and inline tables", () => {
    assert.deepStrictEqual(
      Toml.parse(`
title = "Effect"
ports = [8000, 8001]

[database]
connection.timeout = 30
enabled = true
credentials = { user = "root", roles = ["admin", "writer"] }
`),
      {
        title: "Effect",
        ports: [8000, 8001],
        database: {
          connection: { timeout: 30 },
          enabled: true,
          credentials: { user: "root", roles: ["admin", "writer"] }
        }
      }
    )
  })

  it("parses arrays of tables and date-time values", () => {
    assert.deepStrictEqual(
      Toml.parse(`
[[servers]]
name = "alpha"
started = 2026-08-05T01:02:03Z

[[servers]]
name = "beta"
started = 2026-08-05
`),
      {
        servers: [
          { name: "alpha", started: new Date("2026-08-05T01:02:03Z") },
          { name: "beta", started: "2026-08-05" }
        ]
      }
    )
  })

  it("parses child tables under distinct array entries", () => {
    assert.deepStrictEqual(
      Toml.parse(`
[[servers]]
[servers.tls]

[[servers]]
[servers.tls]
`),
      { servers: [{ tls: {} }, { tls: {} }] }
    )
  })

  it("parses empty quoted keys", () => {
    assert.deepStrictEqual(
      Toml.parse(`"" = 1
nested.'' = 2`),
      { "": 1, nested: { "": 2 } }
    )
  })

  it("rejects empty bare keys, unterminated keys, and duplicate empty keys", () => {
    assert.throws(() => Toml.parse(" = 1\n"))
    assert.throws(() => Toml.parse("a. = 1\n"))
    assert.throws(() => Toml.parse("\" = 1"))
    assert.throws(() => Toml.parse("' = 1"))
    assert.throws(() => Toml.parse(`"" = 1\n'' = 2`))
  })

  it("parses multiline strings and numeric formats", () => {
    assert.deepStrictEqual(
      Toml.parse(`
message = """
hello \\
  world"""
hex = 0xDEAD_BEEF
fraction = 1_000.5
limits = [-9_007_199_254_740_991, 9_007_199_254_740_991]
large_float = 1e20
local = 2026-08-05 01:02:03
`),
      {
        message: "hello world",
        hex: 0xdeadbeef,
        fraction: 1000.5,
        limits: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
        large_float: 1e20,
        local: "2026-08-05T01:02:03"
      }
    )
    for (
      const token of [
        "9007199254740992",
        "-9007199254740992",
        "0x20000000000000",
        "0o400000000000000000",
        "0b100000000000000000000000000000000000000000000000000000"
      ]
    ) {
      assert.throws(() => Toml.parse(`value = ${token}`), SyntaxError, "Integer out of range")
    }
  })

  it.each([
    ["LF", "\nvalue", "value"],
    ["CRLF", "\r\nvalue", "value"],
    ["additional newlines", "\r\n\r\nfirst\r\nsecond", "\r\nfirst\r\nsecond"],
    ["leading whitespace", " \r\nvalue", " \r\nvalue"]
  ])("trims only an immediate opening newline in multiline strings (%s)", (_, content, expected) => {
    assert.deepStrictEqual(
      Toml.parse(`basic = """${content}"""\nliteral = '''${content}'''\n`),
      { basic: expected, literal: expected }
    )
  })

  it("rejects bare carriage returns", () => {
    assert.deepStrictEqual(Toml.parse("a = 1 # comment\r\nb = 2"), { a: 1, b: 2 })
    assert.throws(() => Toml.parse("a = 1 # comment\rb = 2"), SyntaxError, "Bare carriage return")
  })

  it("parses Unicode escapes at the scalar value boundaries", () => {
    assert.deepStrictEqual(
      Toml.parse(String.raw`
before = "\uD7FF"
after = "\uE000"
max = "\U0010FFFF"
`),
      { before: "\uD7FF", after: "\uE000", max: "\u{10FFFF}" }
    )
  })

  it.each([
    String.raw`value = "\uD800"`,
    String.raw`value = "\uDFFF"`,
    String.raw`value = "\uD83D\uDE00"`,
    String.raw`value = "\U00110000"`
  ])("rejects Unicode escapes that are not scalar values: %s", (input) => {
    assert.throws(() => Toml.parse(input), SyntaxError, "Invalid unicode escape at line 1, column 12")
  })

  it("rejects duplicate keys", () => {
    assert.throws(() => Toml.parse("key = 1\nkey = 2\n"))
    assert.throws(() => Toml.parse("key = 1__000\n"))
  })

  it("rejects tables defined twice", () => {
    const invalid = [
      "[fruit]\napple.color = \"red\"\n[fruit.apple]\n",
      "[a.b]\n[a]\nb.c = 1\n",
      "[[a]]\n[a]\n"
    ]
    for (const input of invalid) {
      assert.throws(() => Toml.parse(input))
    }
    assert.deepStrictEqual(
      Toml.parse("[fruit]\napple.color = \"red\"\napple.taste.sweet = true\n[fruit.apple.texture]\nsmooth = true\n"),
      { fruit: { apple: { color: "red", taste: { sweet: true }, texture: { smooth: true } } } }
    )
  })
})
