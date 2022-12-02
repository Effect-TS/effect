import * as Boolean from "@fp-ts/schema/data/Boolean"
import * as DE from "@fp-ts/schema/DecodeError"
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

  describe("UnknownDecoder", () => {
    const decoder = Boolean.UnknownDecoder

    it("baseline", () => {
      expect(decoder.decode(true)).toEqual(D.success(true))
      expect(decoder.decode(false)).toEqual(D.success(false))
      expect(decoder.decode(1)).toEqual(D.failure(DE.notType("boolean", 1)))
    })
  })

  it("JsonEncoder", () => {
    const encoder = Boolean.JsonEncoder
    expect(encoder.encode(true)).toEqual(true)
    expect(encoder.encode(false)).toEqual(false)
  })
})
