import * as parseFloat from "@fp-ts/schema/data/parseFloat"
import * as String from "@fp-ts/schema/data/String"
import * as D from "@fp-ts/schema/Decoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("parseFloat", () => {
  it("property tests", () => {
    Util.property(parseFloat.schema(S.string))
  })

  it("Guard", () => {
    const guard = parseFloat.guard(String.Guard)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  describe("UnknownDecoder", () => {
    const decoder = parseFloat.unknownDecoder(String.UnknownDecoder)

    it("baseline", () => {
      expect(decoder.decode("1")).toEqual(D.success(1))
      expect(decoder.decode("1a")).toEqual(D.success(1))
      Util.expectFailure(decoder, "a", "\"a\" \"cannot be converted to a number by parseFloat\"")
      Util.expectFailure(decoder, "a1", "\"a1\" \"cannot be converted to a number by parseFloat\"")
    })
  })

  it("JsonEncoder", () => {
    const encoder = parseFloat.jsonEncoder(String.JsonEncoder)
    expect(encoder.encode(1)).toEqual("1")
  })
})
