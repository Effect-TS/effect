import * as Command from "@effect/redis/RedisCommand"
import type { Reply } from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"

describe("RedisCommand", () => {
  it("decodes text without letting mutation of an earlier result change future values", () => {
    for (const value of ["OK", "QUEUED", "PONG", "héllo", "é".repeat(33)]) {
      const bytes = new TextEncoder().encode(value)
      const replies: Array<Reply> = [
        { _tag: "SimpleString", value },
        { _tag: "BlobString", value: bytes },
        { _tag: "VerbatimString", format: "txt", value: bytes },
        { _tag: "Attribute", entries: [], value: { _tag: "SimpleString", value } }
      ]
      for (const reply of replies) {
        const decoded = Command.text(reply)
        assert.strictEqual(Result.getOrThrow(decoded), value)
        Reflect.set(decoded, "success", "changed")
        assert.strictEqual(Result.getOrThrow(Command.text(reply)), value)
      }
    }
    assert.isTrue(Result.isFailure(Command.text({ _tag: "Integer", value: BigInt(1) })))
  })

  it("treats stream keys and IDs as opaque after the STREAMS delimiter", () => {
    const args = ["XREAD", "COUNT", "2", "STREAMS", "BLOCK", "STREAMS", "0", "0"]
    assert.deepStrictEqual(Command.parseStreams(args), { keyIndexes: [4, 5], blocking: false })
    assert.deepStrictEqual(Command.inferRouting(args), { keyIndexes: [4, 5] })
  })

  it("skips opaque group and consumer operands before parsing options", () => {
    for (const [group, consumer] of [["STREAMS", "BLOCK"], ["BLOCK", "STREAMS"]]) {
      const args = [
        "XREADGROUP",
        "GROUP",
        group!,
        consumer!,
        "COUNT",
        "1",
        "CLAIM",
        "50",
        "NOACK",
        "STREAMS",
        "stream",
        ">"
      ]
      assert.deepStrictEqual(Command.parseStreams(args), { keyIndexes: [10], blocking: false })
      assert.deepStrictEqual(Command.inferRouting(args), { keyIndexes: [10] })
    }
  })

  it("recognizes BLOCK only as an option and accepts binary case-insensitive keywords", () => {
    const args = ["xreadgroup", "group", "g", "c", "count", "1", "block", "0", "streams", "BLOCK", ">"]
      .map((value) => new TextEncoder().encode(value))
    assert.deepStrictEqual(Command.parseStreams(args), { keyIndexes: [9], blocking: true })
    assert.deepStrictEqual(Command.inferRouting(args), { keyIndexes: [9] })
  })

  it("does not treat option values as delimiters", () => {
    assert.strictEqual(Command.parseStreams(["XREAD", "COUNT", "STREAMS", "key", "0"]), undefined)
    assert.strictEqual(
      Command.parseStreams(["XREADGROUP", "GROUP", "g", "c", "CLAIM", "STREAMS", "key", ">"]),
      undefined
    )
  })

  it("requires a complete recognized grammar and paired stream keys and IDs", () => {
    for (
      const args of [
        ["GET", "STREAMS"],
        ["XREAD", "STREAMS"],
        ["XREAD", "STREAMS", "key"],
        ["XREAD", "COUNT"],
        ["XREAD", "NOACK", "STREAMS", "key", "0"],
        ["XREAD", "CLAIM", "1", "STREAMS", "key", "0"],
        ["XREADGROUP", "STREAMS", "key", ">"],
        ["XREADGROUP", "GROUP", "g", "c", "UNKNOWN", "STREAMS", "key", ">"]
      ]
    ) {
      assert.strictEqual(Command.parseStreams(args), undefined)
    }
  })
})
