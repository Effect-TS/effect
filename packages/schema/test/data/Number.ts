import * as Number from "@fp-ts/schema/data/Number"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as Util from "@fp-ts/schema/test/util"

describe("Number", () => {
  const schema = Number.Schema

  it("id", () => {
    expect(Number.id).exist
  })

  it("Provider", () => {
    expect(Number.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  describe("Decoder", () => {
    const decoder = D.decoderFor(schema)

    it("baseline", () => {
      expect(decoder.decode(1)).toEqual(D.success(1))
      Util.expectFailure(decoder, "a", "\"a\" did not satisfy is(number)")
    })

    it("should warn for NaN", () => {
      Util.expectWarning(decoder, NaN, "did not satisfy not(isNaN)", NaN)
    })

    it("should warn for no finite values", () => {
      Util.expectWarning(decoder, Infinity, "did not satisfy isFinite", Infinity)
      Util.expectWarning(decoder, -Infinity, "did not satisfy isFinite", -Infinity)
    })
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(1)).toEqual(1)
  })
})
