import * as Command from "@effect/redis/RedisCommand"
import type { Reply } from "@effect/redis/RedisProtocol"
import { assert, describe, it } from "@effect/vitest"
import * as Result from "effect/Result"

describe("RedisCommand", () => {
  it("decodes text from string replies", () => {
    const value = new TextEncoder().encode("héllo")
    const replies: Array<Reply> = [
      { _tag: "SimpleString", value: "héllo" },
      { _tag: "BlobString", value },
      { _tag: "Attribute", entries: [], value: { _tag: "BlobString", value } }
    ]
    for (const reply of replies) assert.strictEqual(Result.getOrThrow(Command.text(reply)), "héllo")
    assert.isNull(Result.getOrThrow(Command.text({ _tag: "Null" })))
    assert.isTrue(Result.isFailure(Command.text({ _tag: "Integer", value: 1n })))
  })

  it("routes stream keys after the STREAMS delimiter", () => {
    const xread = ["XREAD", "COUNT", "2", "STREAMS", "BLOCK", "STREAMS", "0", "0"]
    assert.deepStrictEqual(Command.parseStreams(xread), { keyIndexes: [4, 5], blocking: false })
    const xreadgroup = ["XREADGROUP", "GROUP", "STREAMS", "BLOCK", "COUNT", "1", "NOACK", "STREAMS", "stream", ">"]
    assert.deepStrictEqual(Command.parseStreams(xreadgroup), { keyIndexes: [8], blocking: false })
    assert.deepStrictEqual(Command.inferRouting(xreadgroup), { keyIndexes: [8] })
  })

  it("detects the BLOCK option in binary, case-insensitive arguments", () => {
    const args = ["xreadgroup", "group", "g", "c", "block", "0", "streams", "BLOCK", ">"]
      .map((value) => new TextEncoder().encode(value))
    assert.deepStrictEqual(Command.parseStreams(args), { keyIndexes: [7], blocking: true })
  })

  it("rejects incomplete or unrecognized stream grammar", () => {
    for (
      const args of [
        ["GET", "STREAMS"],
        ["XREAD", "STREAMS", "key"],
        ["XREAD", "COUNT", "STREAMS", "key", "0"],
        ["XREAD", "NOACK", "STREAMS", "key", "0"],
        ["XREADGROUP", "STREAMS", "key", ">"]
      ]
    ) {
      assert.strictEqual(Command.parseStreams(args), undefined)
    }
  })
})
