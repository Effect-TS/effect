import { encodeText } from "@effect/redis/internal/protocol"
import * as RedisProtocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"

const bytes = (value: string): Uint8Array => new TextEncoder().encode(value)
const simple = (value: string): RedisProtocol.Reply => ({ _tag: "SimpleString", value })
const blob = (value: string): RedisProtocol.Reply => ({ _tag: "BlobString", value: bytes(value) })
const integer = (value: bigint): RedisProtocol.Reply => ({ _tag: "Integer", value })
const nil: RedisProtocol.Reply = { _tag: "Null" }

const parse = (wire: string): RedisProtocol.Reply => {
  const parser = RedisProtocol.makeParser()
  const replies = parser.push(bytes(wire))
  parser.end()
  assert.strictEqual(replies.length, 1)
  return replies[0]
}

const assertFails = (run: () => unknown, reason: "Protocol" | "Decode" = "Protocol"): void => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { readonly _tag: string })._tag, "RedisError")
    assert.strictEqual((error as { readonly reason: string }).reason, reason)
    return
  }
  assert.fail("Expected RedisError")
}

const goldens: ReadonlyArray<readonly [string, RedisProtocol.Reply]> = [
  ["+OK\r\n", simple("OK")],
  ["-WRONGTYPE Operation against a key\r\n", {
    _tag: "Error",
    code: "WRONGTYPE",
    message: "WRONGTYPE Operation against a key"
  }],
  [":-9223372036854775808\r\n", integer(-9223372036854775808n)],
  [":9223372036854775807\r\n", integer(9223372036854775807n)],
  ["$6\r\nhéllo\r\n", blob("héllo")],
  ["$-1\r\n", nil],
  ["*3\r\n$3\r\nfoo\r\n:7\r\n*1\r\n*-1\r\n", {
    _tag: "Array",
    values: [blob("foo"), integer(7n), { _tag: "Array", values: [nil] }]
  }],
  ["_\r\n", nil],
  ["#t\r\n", { _tag: "Boolean", value: true }],
  [",1.25e-2\r\n", { _tag: "Double", value: 0.0125 }],
  [",-inf\r\n", { _tag: "Double", value: -Infinity }],
  ["(123456789012345678901234567890\r\n", { _tag: "BigNumber", value: 123456789012345678901234567890n }],
  ["!13\r\nERR bad input\r\n", { _tag: "Error", code: "ERR", message: "ERR bad input" }],
  ["=9\r\ntxt:hello\r\n", { _tag: "VerbatimString", format: "txt", value: bytes("hello") }],
  ["%1\r\n+key\r\n:1\r\n", { _tag: "Map", entries: [[simple("key"), integer(1n)]] }],
  ["~2\r\n+one\r\n+two\r\n", { _tag: "Set", values: [simple("one"), simple("two")] }],
  [">3\r\n+message\r\n+channel\r\n+payload\r\n", {
    _tag: "Push",
    values: [simple("message"), simple("channel"), simple("payload")]
  }],
  ["|1\r\n+ttl\r\n:20\r\n+value\r\n", {
    _tag: "Attribute",
    entries: [[simple("ttl"), integer(20n)]],
    value: simple("value")
  }],
  ["$?\r\n;3\r\nfoo\r\n;3\r\nbar\r\n;0\r\n", blob("foobar")],
  ["*?\r\n+one\r\n*?\r\n:2\r\n.\r\n.\r\n", {
    _tag: "Array",
    values: [simple("one"), { _tag: "Array", values: [integer(2n)] }]
  }],
  ["%?\r\n+key\r\n$?\r\n;3\r\nfoo\r\n;0\r\n.\r\n", { _tag: "Map", entries: [[simple("key"), blob("foo")]] }],
  ["~?\r\n+one\r\n.\r\n", { _tag: "Set", values: [simple("one")] }]
]

describe("RedisProtocol", () => {
  it("encodes UTF-8 and binary arguments as bulk strings", () => {
    assert.deepStrictEqual(
      RedisProtocol.encode(["SET", "é", new Uint8Array([0, 255, 13, 10])]),
      new Uint8Array([...bytes("*3\r\n$3\r\nSET\r\n$2\r\né\r\n$4\r\n"), 0, 255, 13, 10, 13, 10])
    )
    assert.deepStrictEqual(RedisProtocol.encode([]), bytes("*0\r\n"))
  })

  it("frames text-only commands with the same byte lengths as the binary encoder", () => {
    for (const argument of ["é", "\u20ac", "\ud83d\ude00", "\ud800", "\udc00", "\ud800é", "\ud800\ud800", "a\ud83d"]) {
      const args = ["ECHO", argument]
      const text = encodeText(args)
      assert.isDefined(text)
      assert.deepStrictEqual(bytes(text!), RedisProtocol.encode(args), JSON.stringify(argument))
    }
    assert.isUndefined(encodeText(["SET", new Uint8Array([1])]))
  })

  it("decodes RESP2 and RESP3 replies split at every boundary", () => {
    for (const [wire, expected] of goldens) {
      const input = bytes(wire)
      for (let split = 0; split <= input.length; split++) {
        const parser = RedisProtocol.makeParser()
        const actual = [...parser.push(input.subarray(0, split)), ...parser.push(input.subarray(split))]
        parser.end()
        assert.deepStrictEqual(actual, [expected], `split ${split} of ${JSON.stringify(wire)}`)
      }
    }
  })

  it("decodes consecutive replies in order and retains partial frames", () => {
    const parser = RedisProtocol.makeParser()
    assert.deepStrictEqual(parser.push(bytes("+OK\r\n:2\r\n$4\r\npa")), [simple("OK"), integer(2n)])
    assert.deepStrictEqual(parser.push(bytes("rt\r\n_\r\n")), [blob("part"), nil])
    parser.end()
  })

  it("rejects malformed replies", () => {
    for (
      const wire of [
        "?hello\r\n",
        "+hello\n",
        ":1.5\r\n",
        ":9223372036854775808\r\n",
        ":-9223372036854775809\r\n",
        "#T\r\n",
        ",Infinity\r\n",
        "$-2\r\n",
        "$1\r\nxab",
        "=3\r\ntxt\r\n",
        "*2x\r\n",
        ".\r\n",
        "$?\r\n+oops\r\n"
      ]
    ) {
      assertFails(() => RedisProtocol.makeParser().push(bytes(wire)))
    }
  })

  it("fails on truncated input at EOF", () => {
    for (const wire of ["+foo\r", "$3\r\nfoo\r", "*2\r\n+one\r\n", "|0\r\n", "$?\r\n;1\r\nx\r\n", "*?\r\n"]) {
      const parser = RedisProtocol.makeParser()
      parser.push(bytes(wire))
      assertFails(() => parser.end())
    }
  })

  it("makes failures and EOF terminal", () => {
    const failed = RedisProtocol.makeParser()
    assertFails(() => failed.push(bytes("+OK\r\n#bad\r\n")))
    assertFails(() => failed.push(bytes("+OK\r\n")))
    const ended = RedisProtocol.makeParser()
    ended.end()
    assertFails(() => ended.push(bytes("+OK\r\n")))
  })

  it("limits the size of each frame", () => {
    assert.deepStrictEqual(
      RedisProtocol.makeParser({ maxFrameSize: 5 }).push(bytes("+OK\r\n+OK\r\n")),
      [simple("OK"), simple("OK")]
    )
    assertFails(() => RedisProtocol.makeParser({ maxFrameSize: 4 }).push(bytes("+OK\r\n")))
    assertFails(() => RedisProtocol.makeParser({ maxFrameSize: 10 }).push(bytes("$100\r\n")))
    assertFails(() =>
      RedisProtocol.makeParser({ maxFrameSize: 20 }).push(bytes("$?\r\n;3\r\nfoo\r\n;3\r\nbar\r\n;0\r\n"))
    )
    const chunked = RedisProtocol.makeParser({ maxFrameSize: 10 })
    chunked.push(bytes("*2\r\n:1\r\n"))
    assertFails(() => chunked.push(bytes(":2\r\n")))
    const unterminated = RedisProtocol.makeParser({ maxFrameSize: 10 })
    unterminated.push(bytes("+aaaaa"))
    assertFails(() => unterminated.push(bytes("aaaaa")))
  })

  it("limits aggregate depth and length", () => {
    assert.deepStrictEqual(RedisProtocol.makeParser({ maxDepth: 2 }).push(bytes("*1\r\n*0\r\n")), [{
      _tag: "Array",
      values: [{ _tag: "Array", values: [] }]
    }])
    assertFails(() => RedisProtocol.makeParser({ maxDepth: 1 }).push(bytes("*1\r\n*0\r\n")))
    assertFails(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("*2\r\n")))
    assertFails(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("*?\r\n:1\r\n:2\r\n")))
  })

  it("rejects invalid parser options", () => {
    for (const options of [{ maxDepth: 0 }, { maxDepth: NaN }, { maxFrameSize: -1 }, { maxAggregateLength: 1.5 }]) {
      assertFails(() => RedisProtocol.makeParser(options))
    }
  })

  it("converts replies to JavaScript values", () => {
    assert.strictEqual(RedisProtocol.toValue(parse("|0\r\n$5\r\nhello\r\n")), "hello")
    assert.strictEqual(RedisProtocol.toValue(parse("=9\r\ntxt:hello\r\n")), "hello")
    assert.deepStrictEqual(RedisProtocol.toValue(parse("%1\r\n+key\r\n:2\r\n")), new Map([["key", 2]]))
    assert.deepStrictEqual(RedisProtocol.toValue(parse("~2\r\n:1\r\n:2\r\n")), new Set([1, 2]))
    assert.deepStrictEqual(RedisProtocol.toValue(parse(">2\r\n+invalidate\r\n_\r\n")), ["invalidate", null])
    assert.strictEqual(
      RedisProtocol.toValue(parse("(123456789012345678901234567890\r\n")),
      123456789012345678901234567890n
    )
    const [value, error] = RedisProtocol.toValue(parse("*2\r\n:1\r\n-ERR failure\r\n")) as [
      number,
      { readonly _tag: string; readonly reason: string; readonly code: string }
    ]
    assert.strictEqual(value, 1)
    assert.deepStrictEqual([error._tag, error.reason, error.code], ["RedisError", "Server", "ERR"])
  })

  it("rejects integers outside the safe range when converting", () => {
    assert.strictEqual(RedisProtocol.toValue(integer(9007199254740991n)), 9007199254740991)
    assertFails(() => RedisProtocol.toValue(integer(9007199254740992n)), "Decode")
  })
})
