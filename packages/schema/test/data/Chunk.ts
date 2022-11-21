import * as A from "@fp-ts/codec/Arbitrary"
import * as DC from "@fp-ts/codec/data/Chunk"
import * as DE from "@fp-ts/codec/DecodeError"
import * as D from "@fp-ts/codec/Decoder"
import * as G from "@fp-ts/codec/Guard"
import * as Sh from "@fp-ts/codec/Show"
import * as C from "@fp-ts/data/Chunk"
import * as fc from "fast-check"

describe("Chunk", () => {
  it("id", () => {
    expect(DC.id).exist
  })

  it("Provider", () => {
    expect(DC.Provider).exist
  })

  it("guard", () => {
    const guard = DC.guard(G.string)
    expect(guard.is(C.empty)).toEqual(true)
    expect(guard.is(C.unsafeFromArray(["a", "b", "c"]))).toEqual(true)

    expect(guard.is(C.unsafeFromArray(["a", "b", 1]))).toEqual(false)
  })

  it("decoder", () => {
    const jsonDecoder = DC.decoder(D.number)
    expect(jsonDecoder.decode([])).toEqual(D.succeed(C.empty))
    expect(jsonDecoder.decode([1, 2, 3])).toEqual(
      D.succeed(C.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(jsonDecoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, C.unsafeFromArray([1, NaN, 3]))
    )
    expect(jsonDecoder.decode(null)).toEqual(
      D.fail(DE.notType("ReadonlyArray<unknown>", null))
    )
    expect(jsonDecoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("jsonDecoder", () => {
    const jsonDecoder = DC.jsonDecoder(D.number)
    expect(jsonDecoder.decode([])).toEqual(D.succeed(C.empty))
    expect(jsonDecoder.decode([1, 2, 3])).toEqual(
      D.succeed(C.unsafeFromArray([1, 2, 3]))
    )
    // should handle warnings
    expect(jsonDecoder.decode([1, NaN, 3])).toEqual(
      D.warn(DE.nan, C.unsafeFromArray([1, NaN, 3]))
    )
    expect(jsonDecoder.decode(null)).toEqual(
      D.fail(DE.notType("JsonArray", null))
    )
    expect(jsonDecoder.decode([1, "a"])).toEqual(
      D.fail(DE.notType("number", "a"))
    )
  })

  it("show", () => {
    const show = DC.show(Sh.number)
    expect(show.show(C.empty)).toEqual("chunk.unsafeFromArray([])")
    expect(show.show(C.unsafeFromArray([1, 2, 3]))).toEqual("chunk.unsafeFromArray([1, 2, 3])")
  })

  it("arbitrary", () => {
    const arbitrary = DC.arbitrary(A.number)
    const guard = G.unsafeGuardFor(arbitrary)
    expect(fc.sample(arbitrary.arbitrary(fc), 10).every(guard.is)).toEqual(true)
  })
})
