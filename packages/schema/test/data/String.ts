import * as String from "@fp-ts/schema/data/String"
import * as D from "@fp-ts/schema/Decoder"
import * as Util from "@fp-ts/schema/test/util"

describe("String", () => {
  it("property tests", () => {
    Util.property(String.Schema)
  })

  it("Guard", () => {
    const guard = String.Guard
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  describe("UnknownDecoder", () => {
    const decoder = String.UnknownDecoder

    it("baseline", () => {
      expect(decoder.decode("a")).toEqual(D.success("a"))
      Util.expectFailure(decoder, 1, "1 did not satisfy is(string)")
    })
  })

  it("JsonEncoder", () => {
    const encoder = String.JsonEncoder
    expect(encoder.encode("a")).toEqual("a")
  })
})
