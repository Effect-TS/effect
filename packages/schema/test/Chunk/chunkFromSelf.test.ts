import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as C from "effect/Chunk"
import { describe, expect, it } from "vitest"

describe("Chunk/chunkFromSelf", () => {
  it("keyof", () => {
    expect(S.keyof(S.chunkFromSelf(S.string))).toEqual(
      S.union(S.literal("_id"), S.literal("length"))
    )
  })

  it("property tests", () => {
    Util.roundtrip(S.chunkFromSelf(S.number))
  })

  it("decoding", async () => {
    const schema = S.chunkFromSelf(S.NumberFromString)
    await Util.expectParseSuccess(schema, C.empty(), C.empty())
    await Util.expectParseSuccess(
      schema,
      C.fromIterable(["1", "2", "3"]),
      C.fromIterable([1, 2, 3])
    )

    await Util.expectParseFailure(
      schema,
      null,
      `Expected Chunk, actual null`
    )
    await Util.expectParseFailure(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `/1 Expected string <-> number, actual "a"`
    )
  })

  it("encoding", async () => {
    const schema = S.chunkFromSelf(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, C.empty(), C.empty())
    await Util.expectEncodeSuccess(
      schema,
      C.fromIterable([1, 2, 3]),
      C.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.chunkFromSelf(S.string)
    const is = P.is(schema)
    expect(is(C.empty())).toEqual(true)
    expect(is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("@effect/schema/test/FakeChunk") })).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.chunkFromSelf(S.string)
    const pretty = Pretty.to(schema)
    expect(pretty(C.empty())).toEqual("Chunk()")
    expect(pretty(C.fromIterable(["a", "b"]))).toEqual(
      `Chunk("a", "b")`
    )
  })
})
