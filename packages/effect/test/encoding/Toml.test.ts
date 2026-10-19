import { assert, describe, it } from "@effect/vitest"
import { Result } from "effect"
import * as Toml from "effect/encoding/Toml"

describe("Toml", () => {
  it("parses tables, dotted keys, arrays, and inline tables", () => {
    assert.deepStrictEqual(
      Result.getOrThrow(Toml.parse(`
title = "Effect"
ports = [8000, 8001]
database.connection.timeout = 30

[database]
enabled = true
credentials = { user = "root", roles = ["admin", "writer"] }
`)),
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
      Result.getOrThrow(Toml.parse(`
[[servers]]
name = "alpha"
started = 2026-08-05T01:02:03Z

[[servers]]
name = "beta"
started = 2026-08-05
`)),
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
      Result.getOrThrow(Toml.parse(`
[[servers]]
[servers.tls]

[[servers]]
[servers.tls]
`)),
      { servers: [{ tls: {} }, { tls: {} }] }
    )
  })

  it("parses multiline strings and numeric formats", () => {
    assert.deepStrictEqual(
      Result.getOrThrow(Toml.parse(`
message = """
hello \\
  world"""
hex = 0xDEAD_BEEF
fraction = 1_000.5
local = 2026-08-05 01:02:03
`)),
      {
        message: "hello world",
        hex: 0xdeadbeef,
        fraction: 1000.5,
        local: "2026-08-05T01:02:03"
      }
    )
  })

  it.each([
    ["LF", "\nvalue", "value"],
    ["CRLF", "\r\nvalue", "value"],
    ["additional newlines", "\r\n\r\nfirst\r\nsecond", "\r\nfirst\r\nsecond"],
    ["leading whitespace", " \r\nvalue", " \r\nvalue"]
  ])("trims only an immediate opening newline in multiline strings (%s)", (_, content, expected) => {
    assert.deepStrictEqual(
      Result.getOrThrow(Toml.parse(`basic = """${content}"""\nliteral = '''${content}'''\n`)),
      { basic: expected, literal: expected }
    )
  })

  it.each(["\"", "'"])("preserves up to two closing content quotes in multiline strings (%s)", (quote) => {
    const delimiter = quote.repeat(3)
    assert.deepStrictEqual(
      Toml.parse(`empty = ${delimiter}${delimiter}
one = ${delimiter}value${quote}${delimiter}
two = ${delimiter}value${quote}${quote}${delimiter}`),
      { empty: "", one: `value${quote}`, two: `value${quote}${quote}` }
    )
  })

  it("preserves escaped quotes before multiline closing content quotes", () => {
    assert.deepStrictEqual(Toml.parse(String.raw`value = """value\""""""`), { value: "value\"\"\"" })
  })

  it.each(["\"", "'"])("rejects six or more closing quotes in multiline strings (%s)", (quote) => {
    for (const count of [6, 7]) {
      assert.throws(() => Toml.parse(`value = ${quote.repeat(3)}value${quote.repeat(count)}`), SyntaxError)
    }
  })

  it("rejects duplicate keys", () => {
    const duplicate = Toml.parse("key = 1\nkey = 2\n")
    assert.isTrue(Result.isFailure(duplicate))
    if (Result.isFailure(duplicate)) {
      assert.strictEqual(duplicate.failure.kind, "Decode")
      assert.strictEqual(duplicate.failure.module, "Toml")
      assert.strictEqual(duplicate.failure.input, "key = 1\nkey = 2\n")
      assert.strictEqual(duplicate.failure.message, "Cannot redefine existing key 'key' at line 2, column 8")
    }

    assert.isTrue(Result.isFailure(Toml.parse("key = 1__000\n")))
  })

  it("rejects extending inline tables and arrays", () => {
    assert.isTrue(Result.isFailure(Toml.parse("point = { x = 1 }\npoint.y = 2\n")))
    assert.isTrue(Result.isFailure(Toml.parse("point = { x = 1 }\n[point]\ny = 2\n")))
    assert.isTrue(Result.isFailure(Toml.parse("fruits = []\n[[fruits]]\n")))
    assert.deepStrictEqual(Result.getOrThrow(Toml.parse("t = { a.x = 1, a.y = 2 }\n")), { t: { a: { x: 1, y: 2 } } })
  })
})
