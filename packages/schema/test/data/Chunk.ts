import * as DC from "@fp-ts/data/Chunk"
import * as C from "@fp-ts/schema/data/Chunk"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("Chunk", () => {
  it("id", () => {
    expect(C.id).exist
  })

  it("Provider", () => {
    expect(C.Provider).exist
  })

  it("guard", () => {
    const schema = C.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(DC.empty)).toEqual(true)
    expect(guard.is(DC.unsafeFromArray(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(DC.unsafeFromArray(["a", "b", 1]))).toEqual(false)
  })

  it("unknownDecoder", () => {
    const schema = C.schema(S.number)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(DC.empty))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    Util.expectWarning(
      decoder,
      [1, NaN, 3],
      "/1 did not satisfy isNot(NaN)",
      DC.unsafeFromArray([1, NaN, 3])
    )
    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)")
  })

  it("jsonDecoder", () => {
    const schema = C.schema(S.number)
    const decoder = JD.jsonDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.success(DC.empty))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.success(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(decoder.decode([1, NaN, 3])).toEqual(
      D.warning(DE.index(1, DC.singleton(DE.nan)), DC.unsafeFromArray([1, NaN, 3]))
    )
    Util.expectFailure(decoder, null, "null did not satisfy is(ReadonlyArray<unknown>)")
    Util.expectFailure(decoder, [1, "a"], "/1 \"a\" did not satisfy is(number)")
  })

  it("property tests", () => {
    Util.property(C.schema(S.number))
  })
})
