import * as C from "@fp-ts/data/Chunk"
import * as Chunk from "@fp-ts/schema/data/Chunk"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("Chunk", () => {
  it("id", () => {
    expect(Chunk.id).exist
  })

  it("Provider", () => {
    expect(Chunk.Provider).exist
  })

  it("property tests", () => {
    Util.property(Chunk.schema(S.number))
  })

  it("guard", () => {
    const schema = Chunk.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(C.empty)).toEqual(true)
    expect(guard.is(C.unsafeFromArray(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(C.unsafeFromArray(["a", "b", 1]))).toEqual(false)
  })

  it("Decoder", () => {
    const schema = Chunk.schema(S.number)
    const decoder = D.decoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(C.empty))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(C.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    Util.expectWarning(
      decoder,
      [1, NaN, 3],
      "/1 did not satisfy not(isNaN)",
      C.unsafeFromArray([1, NaN, 3])
    )
    Util.expectFailure(decoder, null, "null did not satisfy is(UnknownArray)")
    Util.expectFailure(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)")
  })

  it("Encoder", () => {
    const schema = Chunk.schema(S.number)
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(C.empty)).toEqual([])
    expect(encoder.encode(C.unsafeFromArray([1, 2, 3]))).toEqual(
      [1, 2, 3]
    )
  })

  it("Pretty", () => {
    const schema = Chunk.schema(S.string)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(C.empty)).toEqual("Chunk()")
    expect(pretty.pretty(C.unsafeFromArray(["a", "b"]))).toEqual(
      "Chunk(\"a\", \"b\")"
    )
  })
})
