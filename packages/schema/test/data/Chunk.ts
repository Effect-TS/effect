import * as DC from "@fp-ts/data/Chunk"
import * as A from "@fp-ts/schema/Arbitrary"
import * as C from "@fp-ts/schema/data/Chunk"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"
import * as UD from "@fp-ts/schema/UnknownDecoder"
import * as fc from "fast-check"

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

  it("decoder", () => {
    const schema = C.schema(S.number)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode([])).toEqual(D.succeed(DC.empty))
    expect(decoder.decode([1, 2, 3])).toEqual(
      D.succeed(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(decoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, DC.unsafeFromArray([1, NaN, 3]))
    )
    expect(decoder.decode(null)).toEqual(
      D.fail(DE.notType("ReadonlyArray<unknown>", null))
    )
    expect(decoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("jsonDecoder", () => {
    const schema = C.schema(S.number)
    const jsonDecoder = JD.jsonDecoderFor(schema)
    expect(jsonDecoder.decode([])).toEqual(D.succeed(DC.empty))
    expect(jsonDecoder.decode([1, 2, 3])).toEqual(
      D.succeed(DC.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(jsonDecoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, DC.unsafeFromArray([1, NaN, 3]))
    )
    expect(jsonDecoder.decode(null)).toEqual(
      D.fail(DE.notType("JsonArray", null))
    )
    expect(jsonDecoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("arbitrary", () => {
    const schema = C.schema(S.number)
    const arbitrary = A.arbitraryFor(schema)
    const guard = G.guardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), 10).every(guard.is)).toEqual(true)
  })
})
