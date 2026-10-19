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

  it("keeps one or two quotes right before the closing delimiter of a multiline string", () => {
    // TOML 1.0 spec examples for multiline basic and literal strings
    assert.deepStrictEqual(
      Toml.parse(`
str4 = """Here are two quotation marks: "". Simple enough."""
str5 = """Here are three quotation marks: ""\\"."""
str6 = """Here are fifteen quotation marks: ""\\"""\\"""\\"""\\"""\\"."""
str7 = """"This," she said, "is just a pointless statement.""""
quot15 = '''Here are fifteen quotation marks: """""""""""""""'''
apos15 = "Here are fifteen apostrophes: '''''''''''''''"
str = ''''That,' she said, 'is still pointless.''''
one = """a""""
`),
      {
        str4: "Here are two quotation marks: \"\". Simple enough.",
        str5: "Here are three quotation marks: \"\"\".",
        str6: "Here are fifteen quotation marks: \"\"\"\"\"\"\"\"\"\"\"\"\"\"\".",
        str7: "\"This,\" she said, \"is just a pointless statement.\"",
        quot15: "Here are fifteen quotation marks: \"\"\"\"\"\"\"\"\"\"\"\"\"\"\"",
        apos15: "Here are fifteen apostrophes: '''''''''''''''",
        str: "'That,' she said, 'is still pointless.'",
        one: "a\""
      }
    )
    assert.throws(() => Toml.parse(`x = """a""""""\n`), SyntaxError)
    assert.throws(() => Toml.parse(`x = '''a''''''\n`), SyntaxError)
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
