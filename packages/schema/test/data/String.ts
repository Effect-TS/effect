import * as String from "@fp-ts/schema/data/String"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("String", () => {
  const schema = String.Schema

  it("id", () => {
    expect(String.id).exist
  })

  it("Provider", () => {
    expect(String.Provider).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is("a")).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("UnknownDecoder", () => {
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode("a")).toEqual(D.success("a"))
    Util.expectFailure(decoder, 1, "1 did not satisfy is(string)")
  })

  it("JsonEncoder", () => {
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode("a")).toEqual("a")
  })
})
