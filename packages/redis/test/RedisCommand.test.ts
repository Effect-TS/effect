import * as Command from "@effect/redis/RedisCommand"
import { assert, describe, it } from "@effect/vitest"

describe("Redis stream command grammar", () => {
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
