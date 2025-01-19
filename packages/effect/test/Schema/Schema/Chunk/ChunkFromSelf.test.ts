import * as C from "effect/Chunk"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("ChunkFromSelf", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.ChunkFromSelf(S.Number))
  })

  it("decoding", async () => {
    const schema = S.ChunkFromSelf(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, C.empty(), C.empty())
    await Util.expectDecodeUnknownSuccess(
      schema,
      C.fromIterable(["1", "2", "3"]),
      C.fromIterable([1, 2, 3])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Chunk<NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      C.fromIterable(["1", "a", "3"]),
      `Chunk<NumberFromString>
└─ ReadonlyArray<NumberFromString>
   └─ [1]
      └─ NumberFromString
         └─ Transformation process failure
            └─ Unable to decode "a" into a number`
    )
  })

  it("encoding", async () => {
    const schema = S.ChunkFromSelf(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, C.empty(), C.empty())
    await Util.expectEncodeSuccess(
      schema,
      C.fromIterable([1, 2, 3]),
      C.fromIterable(["1", "2", "3"])
    )
  })

  it("is", () => {
    const schema = S.ChunkFromSelf(S.String)
    const is = P.is(schema)
    expect(is(C.empty())).toEqual(true)
    expect(is(C.fromIterable(["a", "b", "c"]))).toEqual(true)

    expect(is(C.fromIterable(["a", "b", 1]))).toEqual(false)
    expect(is({ _id: Symbol.for("effect/Schema/test/FakeChunk") })).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.ChunkFromSelf(S.String)
    const pretty = Pretty.make(schema)
    expect(pretty(C.empty())).toEqual("Chunk()")
    expect(pretty(C.fromIterable(["a", "b"]))).toEqual(
      `Chunk("a", "b")`
    )
  })
})
