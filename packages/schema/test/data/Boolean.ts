import * as Boolean from "@fp-ts/schema/data/Boolean"
import * as D from "@fp-ts/schema/Decoder"
import * as Util from "@fp-ts/schema/test/util"

describe("Boolean", () => {
  it("property tests", () => {
    Util.property(Boolean.Schema)
  })

  it("Guard", () => {
    const guard = Boolean.Guard
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("UnknownDecoder", () => {
    const decoder = Boolean.UnknownDecoder
    expect(decoder.decode(true)).toEqual(D.success(true))
    expect(decoder.decode(false)).toEqual(D.success(false))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(boolean)")
  })

  it("JsonEncoder", () => {
    const encoder = Boolean.JsonEncoder
    expect(encoder.encode(true)).toEqual(true)
    expect(encoder.encode(false)).toEqual(false)
  })
})
