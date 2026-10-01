import * as RedisProtocol from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import * as fc from "fast-check"

const bytes = (value: string): Uint8Array => new TextEncoder().encode(value)
const simple = (value: string): RedisProtocol.Reply => ({ _tag: "SimpleString", value })
const blob = (value: string): RedisProtocol.Reply => ({ _tag: "BlobString", value: bytes(value) })
const integer = (value: bigint): RedisProtocol.Reply => ({ _tag: "Integer", value })
const nil: RedisProtocol.Reply = { _tag: "Null" }
const parse = (wire: string): RedisProtocol.Reply => {
  const parser = RedisProtocol.makeParser()
  const result = parser.push(bytes(wire))
  parser.end()
  assert.strictEqual(result.length, 1)
  return result[0]
}
const failure = (run: () => unknown, reason: "Protocol" | "Decode" = "Protocol"): void => {
  try {
    run()
  } catch (error) {
    assert.strictEqual((error as { _tag: string })._tag, "RedisError")
    assert.strictEqual((error as { reason: string }).reason, reason)
    return
  }
  assert.fail("Expected RedisError")
}

// Hand-written RESP wire examples are independent from the command encoder.
const goldens: ReadonlyArray<readonly [string, RedisProtocol.Reply]> = [
  ["+OK\r\n", simple("OK")],
  ["+QUEUED\r\n", simple("QUEUED")],
  ["+PONG\r\n", simple("PONG")],
  ["+héllo ☃\r\n", simple("héllo ☃")],
  [`+${"a".repeat(64)}\r\n`, simple("a".repeat(64))],
  [`+${"a".repeat(65)}\r\n`, simple("a".repeat(65))],
  [`+${"é".repeat(33)}\r\n`, simple("é".repeat(33))],
  ["-WRONGTYPE Operation against a key holding the wrong kind of value\r\n", {
    _tag: "Error",
    code: "WRONGTYPE",
    message: "WRONGTYPE Operation against a key holding the wrong kind of value"
  }],
  [":-9223372036854775808\r\n", integer(-9223372036854775808n)],
  [":9223372036854775807\r\n", integer(9223372036854775807n)],
  [":+9223372036854775807\r\n", integer(9223372036854775807n)],
  [":+0\r\n", integer(0n)],
  [":-0\r\n", integer(0n)],
  [":000000000000000000001\r\n", integer(1n)],
  [":+000000000000000000001\r\n", integer(1n)],
  [":+0000000000000000000001\r\n", integer(1n)],
  [":9007199254740989\r\n", integer(9007199254740989n)],
  [":9007199254740990\r\n", integer(9007199254740990n)],
  [":9007199254740991\r\n", integer(9007199254740991n)],
  [":9007199254740992\r\n", integer(9007199254740992n)],
  [":9007199254740993\r\n", integer(9007199254740993n)],
  [":-9007199254740993\r\n", integer(-9007199254740993n)],
  [":-000000000000000000000001\r\n", integer(-1n)],
  ["$0\r\n\r\n", blob("")],
  ["$000\r\n\r\n", blob("")],
  ["$003\r\nfoo\r\n", blob("foo")],
  ["$000000000000000000000003\r\nfoo\r\n", blob("foo")],
  ["$6\r\nhéllo\r\n", blob("héllo")],
  ["$-1\r\n", nil],
  ["*-1\r\n", nil],
  ["*0\r\n", { _tag: "Array", values: [] }],
  ["*3\r\n$3\r\nfoo\r\n:7\r\n*1\r\n$-1\r\n", {
    _tag: "Array",
    values: [blob("foo"), integer(7n), { _tag: "Array", values: [nil] }]
  }],
  ["_\r\n", nil],
  ["#t\r\n", { _tag: "Boolean", value: true }],
  ["#f\r\n", { _tag: "Boolean", value: false }],
  [",1.25e-2\r\n", { _tag: "Double", value: 0.0125 }],
  [",-inf\r\n", { _tag: "Double", value: -Infinity }],
  [",inf\r\n", { _tag: "Double", value: Infinity }],
  [",nan\r\n", { _tag: "Double", value: NaN }],
  ["(123456789012345678901234567890\r\n", { _tag: "BigNumber", value: 123456789012345678901234567890n }],
  ["(+123456789012345678901234567890\r\n", { _tag: "BigNumber", value: 123456789012345678901234567890n }],
  ["!13\r\nERR bad input\r\n", { _tag: "Error", code: "ERR", message: "ERR bad input" }],
  ["=9\r\ntxt:hello\r\n", { _tag: "VerbatimString", format: "txt", value: bytes("hello") }],
  ["%2\r\n+first\r\n:1\r\n+second\r\n:2\r\n", {
    _tag: "Map",
    entries: [[simple("first"), integer(1n)], [simple("second"), integer(2n)]]
  }],
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
  ["|0\r\n|0\r\n+value\r\n", {
    _tag: "Attribute",
    entries: [],
    value: { _tag: "Attribute", entries: [], value: simple("value") }
  }],
  ["$?\r\n;3\r\nfoo\r\n;3\r\nbar\r\n;0\r\n", blob("foobar")],
  ["$?\r\n;0\r\n", blob("")],
  ["*?\r\n+one\r\n*?\r\n:2\r\n.\r\n.\r\n", {
    _tag: "Array",
    values: [simple("one"), { _tag: "Array", values: [integer(2n)] }]
  }],
  ["%?\r\n+key\r\n$?\r\n;3\r\nfoo\r\n;0\r\n.\r\n", {
    _tag: "Map",
    entries: [[simple("key"), blob("foo")]]
  }],
  ["~?\r\n+one\r\n+two\r\n.\r\n", { _tag: "Set", values: [simple("one"), simple("two")] }]
]

describe("RedisProtocol", () => {
  it("encodes UTF-8 and arbitrary binary command arguments as bulk strings", () => {
    assert.deepStrictEqual(
      RedisProtocol.encode(["SET", "é", new Uint8Array([0, 255, 13, 10])]),
      new Uint8Array([
        ...bytes("*3\r\n$3\r\nSET\r\n$2\r\né\r\n$4\r\n"),
        0,
        255,
        13,
        10,
        13,
        10
      ])
    )
    assert.deepStrictEqual(RedisProtocol.encode([]), bytes("*0\r\n"))
    const utf16 = fc.array(fc.integer({ min: 0, max: 0xFFFF }), { maxLength: 80 }).map((units) =>
      String.fromCharCode(...units)
    )
    fc.assert(fc.property(utf16, (value) => {
      const payload = bytes(value)
      const header = bytes(`*2\r\n$4\r\nECHO\r\n$${payload.length}\r\n`)
      assert.deepStrictEqual(
        RedisProtocol.encode(["ECHO", value]),
        new Uint8Array([...header, ...payload, 13, 10])
      )
    }))
  })

  it("decodes independent RESP2/RESP3 goldens at every split boundary", () => {
    for (const [wire, expected] of goldens) {
      const input = bytes(wire)
      for (let split = 0; split <= input.length; split++) {
        const parser = RedisProtocol.makeParser()
        const actual = [...parser.push(input.subarray(0, split)), ...parser.push(input.subarray(split))]
        parser.end()
        assert.deepStrictEqual(actual, [expected], `split ${split} of ${wire}`)
      }
      const parser = RedisProtocol.makeParser()
      const actual = Array.from(input, (byte) => parser.push(new Uint8Array([byte]))).flat()
      parser.end()
      assert.deepStrictEqual(actual, [expected])
    }
  })

  it("preserves reply order across concatenated messages and partial frames", () => {
    const parser = RedisProtocol.makeParser()
    assert.deepStrictEqual(parser.push(bytes("+OK\r\n:2\r\n$4\r\npa")), [simple("OK"), integer(2n)])
    assert.deepStrictEqual(parser.push(bytes("rt\r\n_\r\n")), [blob("part"), nil])
    parser.end()
  })

  it("preserves arbitrary signed 64-bit integers exactly", () => {
    fc.assert(fc.property(fc.bigInt({ min: -9223372036854775808n, max: 9223372036854775807n }), (value) => {
      assert.deepStrictEqual(parse(`:${value}\r\n`), integer(value))
    }))
    const parser = RedisProtocol.makeParser()
    const first = parser.push(bytes(":1\r\n"))[0]
    Reflect.set(first, "value", 99n)
    assert.deepStrictEqual(parser.push(bytes(":1\r\n")), [integer(1n)])
    parser.end()
  })

  it("keeps later acknowledgements unchanged after attempted mutation of an earlier reply", () => {
    for (const value of ["OK", "QUEUED", "PONG"]) {
      const reply = parse(`+${value}\r\n`)
      Reflect.set(reply, "value", "changed")
      Reflect.set(reply, "_tag", "Error")
      assert.deepStrictEqual(parse(`+${value}\r\n`), simple(value))
    }
    for (const value of ["ok", "OK ", "PONG!", "QUÉUED", "é".repeat(33)]) {
      assert.deepStrictEqual(parse(`+${value}\r\n`), simple(value))
    }
  })

  it("keeps binary views independent from input, sibling mutations, and later replies", () => {
    const parser = RedisProtocol.makeParser()
    const input = new Uint8Array([
      ...bytes("$4\r\n"),
      0,
      255,
      13,
      10,
      13,
      10,
      ...bytes("=8\r\ntxt:last\r\n$4\r\nne")
    ])
    const [result, sibling] = parser.push(input)
    input.fill(0)
    const next = parser.push(bytes("xt\r\n"))[0]
    assert.deepStrictEqual(result, { _tag: "BlobString", value: new Uint8Array([0, 255, 13, 10]) })
    assert.deepStrictEqual(sibling, { _tag: "VerbatimString", format: "txt", value: bytes("last") })
    assert.deepStrictEqual(next, blob("next"))
    assert.strictEqual(result._tag, "BlobString")
    assert.strictEqual(sibling._tag, "VerbatimString")
    assert.strictEqual(next._tag, "BlobString")
    if (result._tag === "BlobString" && sibling._tag === "VerbatimString" && next._tag === "BlobString") {
      result.value.fill(7)
      assert.deepStrictEqual(sibling.value, bytes("last"))
      assert.deepStrictEqual(next.value, bytes("next"))
      sibling.value.fill(8)
      next.value.fill(9)
      assert.deepStrictEqual(result.value, new Uint8Array([7, 7, 7, 7]))
      assert.deepStrictEqual(sibling.value, new Uint8Array([8, 8, 8, 8]))
    }
    parser.end()
  })

  it("bounds retained snapshots when one input contains many small binary replies", () => {
    const parser = RedisProtocol.makeParser({ maxFrameSize: 32 })
    const input = bytes("$1\r\nx\r\n".repeat(10_000))
    const output = parser.push(input)
    input.fill(0)
    parser.end()
    assert.strictEqual(output.length, 10_000)
    for (const reply of output) {
      assert.deepStrictEqual(reply, blob("x"))
      if (reply._tag === "BlobString") assert.isAtMost(reply.value.buffer.byteLength, 32)
    }
  })

  it("handles arbitrary binary bodies and independently generated chunk partitions", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uint8Array({ maxLength: 256 }), { maxLength: 12 }),
        fc.array(fc.integer({ min: 1, max: 31 }), { minLength: 1, maxLength: 20 }),
        (values, widths) => {
          // The fixture writer emits the documented grammar directly, without encode().
          const wire = new Uint8Array([
            ...bytes(`*${values.length}\r\n`),
            ...values.flatMap((value) => [...bytes(`$${value.length}\r\n`), ...value, 13, 10])
          ])
          const parser = RedisProtocol.makeParser()
          const output: Array<RedisProtocol.Reply> = []
          let offset = 0
          let part = 0
          while (offset < wire.length) {
            const next = Math.min(offset + widths[part++ % widths.length], wire.length)
            const chunk = wire.subarray(offset, next)
            output.push(...parser.push(chunk))
            chunk.fill(254)
            offset = next
          }
          parser.end()
          assert.deepStrictEqual(output, [{
            _tag: "Array",
            values: values.map((value): RedisProtocol.Reply => ({ _tag: "BlobString", value }))
          }])
        }
      ),
      { numRuns: 200 }
    )
  })

  it("rejects malformed markers, lengths, scalars, terminators, and streamed forms", () => {
    for (
      const wire of [
        "?hello\r\n",
        "+hello\n",
        "+hello\rx",
        ":1.5\r\n",
        ":++1\r\n",
        ":+-1\r\n",
        ":+\r\n",
        ":-\r\n",
        ": 1\r\n",
        ":1\t\r\n",
        ":1\n",
        ":1\rx",
        ":\uFEFF1\r\n",
        ":\r\n",
        ":9223372036854775808\r\n",
        ":-9223372036854775809\r\n",
        "(1x\r\n",
        "#T\r\n",
        "_null\r\n",
        ",Infinity\r\n",
        ",1e\r\n",
        ",.5\r\n",
        ",1.\r\n",
        "$-2\r\n",
        "$+1\r\n",
        "$1.0\r\n",
        "$9007199254740992\r\n",
        "$1\r\nxab",
        "$1\r\nx\rx",
        "=-1\r\n",
        "=3\r\ntxt\r\n",
        "=4\r\ntxt!\r\n",
        "*2x\r\n",
        "%-1\r\n",
        "~-1\r\n",
        ">?\r\n",
        "|?\r\n",
        ".\r\n",
        "*1\r\n.\r\n",
        "%?\r\n+k\r\n.\r\n",
        "*?\r\n.x\r\n",
        ";1\r\na\r\n",
        "$?\r\n+oops\r\n",
        "$?\r\n;-1\r\n"
      ]
    ) failure(() => RedisProtocol.makeParser().push(bytes(wire)))
    for (
      const wire of [
        ":+\r\n",
        ":-\r\n",
        ":1x\r\n",
        ":\u00FF\r\n",
        ":9223372036854775808\r\n",
        ":-9223372036854775809\r\n",
        "$\r\n",
        "$1x\r\n",
        "$1\n",
        "$1\rx",
        "$+0\r\n",
        "$9007199254740992\r\n",
        "+OK\rx",
        "+PONG\n",
        "+QUEUED\rx"
      ]
    ) {
      const input = bytes(`:1\r\n${wire}:2\r\n`)
      for (let split = 0; split <= input.length; split++) {
        const parser = RedisProtocol.makeParser()
        failure(() => {
          parser.push(input.subarray(0, split))
          parser.push(input.subarray(split))
        })
        failure(() => parser.push(bytes(":3\r\n")))
        failure(() => parser.end())
      }
    }
    for (const marker of [":", "(", ",", "$", "!", "=", "*", "%", "~", ">", "|", "#", "_"]) {
      const parser = RedisProtocol.makeParser()
      failure(() => parser.push(new Uint8Array([marker.charCodeAt(0), 255, 13, 10])))
      failure(() => parser.push(bytes("+OK\r\n")))
    }
  })

  it("validates EOF and makes failures terminal", () => {
    for (
      const wire of ["+", "+foo\r", "$3\r\nx", "$3\r\nfoo\r", "*2\r\n+one\r\n", "|0\r\n", "$?\r\n;1\r\nx\r\n", "*?\r\n"]
    ) {
      const parser = RedisProtocol.makeParser()
      parser.push(bytes(wire))
      failure(() => parser.end())
      failure(() => parser.push(bytes("+OK\r\n")))
    }
    const parser = RedisProtocol.makeParser()
    failure(() => parser.push(bytes("+OK\r\n#bad\r\n")))
    failure(() => parser.push(bytes("+OK\r\n")))
    const clean = RedisProtocol.makeParser()
    clean.end()
    failure(() => clean.push(bytes("+OK\r\n")))
  })

  it("enforces whole-frame size independently of chunk boundaries and reply counts", () => {
    const parser = RedisProtocol.makeParser({ maxFrameSize: 5 })
    assert.deepStrictEqual(parser.push(bytes("+OK\r\n+OK\r\n")), [simple("OK"), simple("OK")])
    failure(() => RedisProtocol.makeParser({ maxFrameSize: 4 }).push(bytes("+OK\r\n")))
    failure(() => RedisProtocol.makeParser({ maxFrameSize: 10 }).push(bytes("$100\r\n")))
    const nested = RedisProtocol.makeParser({ maxFrameSize: 10 })
    nested.push(bytes("*2\r\n:1\r\n"))
    failure(() => nested.push(bytes(":2\r\n")))
    for (
      const wire of [
        ":1\r\n",
        ":+0\r\n",
        "*2\r\n:1\r\n:2\r\n",
        "|0\r\n:1\r\n",
        "+OK\r\n",
        "+QUEUED\r\n",
        "+PONG\r\n",
        "$0\r\n\r\n",
        "$003\r\nfoo\r\n",
        "$000000000000000000000003\r\nfoo\r\n",
        "*3\r\n+OK\r\n$3\r\nfoo\r\n+QUEUED\r\n",
        "|0\r\n$3\r\nfoo\r\n"
      ]
    ) {
      const input = bytes(wire)
      const expected = RedisProtocol.makeParser().push(input)
      for (let split = 0; split <= input.length; split++) {
        const exact = RedisProtocol.makeParser({ maxFrameSize: input.length })
        assert.deepStrictEqual([
          ...exact.push(input.subarray(0, split)),
          ...exact.push(input.subarray(split))
        ], expected)
        exact.end()
        const limited = RedisProtocol.makeParser({ maxFrameSize: input.length - 1 })
        failure(() => {
          limited.push(input.subarray(0, split))
          limited.push(input.subarray(split))
        })
        failure(() => limited.push(bytes(":1\r\n")))
      }
    }
    const streamed = RedisProtocol.makeParser({ maxFrameSize: 20 })
    failure(() => streamed.push(bytes("$?\r\n;3\r\nfoo\r\n;3\r\nbar\r\n;0\r\n")))
  })

  it("bounds aggregate nesting and both known and streamed member counts", () => {
    assert.deepStrictEqual(RedisProtocol.makeParser({ maxDepth: 2 }).push(bytes("*1\r\n*0\r\n")), [{
      _tag: "Array",
      values: [{ _tag: "Array", values: [] }]
    }])
    failure(() => RedisProtocol.makeParser({ maxDepth: 1 }).push(bytes("*1\r\n*0\r\n")))
    failure(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("*2\r\n")))
    failure(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("%2\r\n")))
    failure(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("*?\r\n:1\r\n:2\r\n")))
    failure(() => RedisProtocol.makeParser({ maxAggregateLength: 1 }).push(bytes("%?\r\n+a\r\n:1\r\n+b\r\n")))
    assert.deepStrictEqual(RedisProtocol.makeParser({ maxAggregateLength: 0 }).push(bytes("|0\r\n+OK\r\n")), [{
      _tag: "Attribute",
      entries: [],
      value: simple("OK")
    }])
    for (const options of [{ maxDepth: 0 }, { maxDepth: NaN }, { maxFrameSize: -1 }, { maxAggregateLength: 1.5 }]) {
      failure(() => RedisProtocol.makeParser(options))
    }
  })

  it("consumes a large body fragmented into individual bytes", () => {
    const value = new Uint8Array(128 * 1024).fill(255)
    const parser = RedisProtocol.makeParser()
    parser.push(bytes(`$${value.length}\r\n`))
    for (const byte of value) assert.deepStrictEqual(parser.push(new Uint8Array([byte])), [])
    assert.deepStrictEqual(parser.push(bytes("\r\n")), [{ _tag: "BlobString", value }])
    parser.end()
  })

  it("converts legacy values while preserving errors, collections, and big numbers", () => {
    assert.strictEqual(RedisProtocol.toValue(parse("|0\r\n$5\r\nhello\r\n")), "hello")
    assert.deepStrictEqual(RedisProtocol.toValue(parse("%1\r\n+key\r\n:2\r\n")), new Map([["key", 2]]))
    assert.deepStrictEqual(RedisProtocol.toValue(parse("~2\r\n:1\r\n:2\r\n")), new Set([1, 2]))
    assert.strictEqual(
      RedisProtocol.toValue(parse("(123456789012345678901234567890\r\n")),
      123456789012345678901234567890n
    )
    assert.strictEqual(RedisProtocol.toValue(parse("=9\r\ntxt:hello\r\n")), "hello")
    assert.deepStrictEqual(RedisProtocol.toValue(parse(">2\r\n+invalidate\r\n_\r\n")), ["invalidate", null])
    const result = RedisProtocol.toValue(parse("*2\r\n:1\r\n-ERR failure\r\n")) as [
      number,
      { _tag: string; reason: string; code: string }
    ]
    assert.strictEqual(result[0], 1)
    assert.strictEqual(result[1]._tag, "RedisError")
    assert.strictEqual(result[1].reason, "Server")
    assert.strictEqual(result[1].code, "ERR")
    failure(() => RedisProtocol.toValue(integer(9007199254740992n)), "Decode")
    assert.strictEqual(RedisProtocol.toValue(integer(9007199254740991n)), 9007199254740991)
  })
})
