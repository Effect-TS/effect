import * as Number from "@fp-ts/schema/data/Number"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as Util from "@fp-ts/schema/test/util"

describe("Number", () => {
  it("property tests", () => {
    Util.property(Number.Schema)
  })

  it("Guard", () => {
    const guard = Number.Guard
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  describe("UnknownDecoder", () => {
    const decoder = Number.UnknownDecoder

    it("baseline", () => {
      expect(decoder.decode(1)).toEqual(D.success(1))
      Util.expectFailure(decoder, "a", "\"a\" did not satisfy is(number)")
    })

    it("should warn for NaN", () => {
      expect(decoder.decode(NaN)).toEqual(D.warning(DE.nan, NaN))
    })

    it("should warn for no finite values", () => {
      expect(decoder.decode(Infinity)).toEqual(D.warning(DE.noFinite, Infinity))
      expect(decoder.decode(-Infinity)).toEqual(D.warning(DE.noFinite, -Infinity))
    })
  })

  it("JsonEncoder", () => {
    const encoder = Number.JsonEncoder
    expect(encoder.encode(1)).toEqual(1)
  })
})
