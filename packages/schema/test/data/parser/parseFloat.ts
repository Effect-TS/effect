import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("parseFloat", () => {
  const schema = parseFloat.schema(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  describe("UnknownDecoder", () => {
    const decoder = UD.unknownDecoderFor(schema)

    it("baseline", () => {
      expect(decoder.decode("1")).toEqual(D.success(1))
      expect(decoder.decode("1a")).toEqual(D.success(1))
      Util.expectFailure(decoder, "a", "\"a\" \"cannot be converted to a number by parseFloat\"")
      Util.expectFailure(decoder, "a1", "\"a1\" \"cannot be converted to a number by parseFloat\"")
    })
  })

  it("JsonEncoder", () => {
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode(1)).toEqual("1")
  })
})
