import * as Number from "@fp-ts/schema/data/Number"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as Util from "@fp-ts/schema/test/util"

describe("Number", () => {
  it("property tests", () => {
    Util.property(Number.Schema)
  })

  it("should warn for NaN", () => {
    expect(Number.UnknownDecoder.decode(NaN)).toEqual(D.warning(DE.nan, NaN))
  })

  it("should warn for no finite values", () => {
    expect(Number.UnknownDecoder.decode(Infinity)).toEqual(D.warning(DE.noFinite, Infinity))
    expect(Number.UnknownDecoder.decode(-Infinity)).toEqual(D.warning(DE.noFinite, -Infinity))
  })
})
