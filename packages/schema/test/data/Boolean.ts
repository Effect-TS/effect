import * as Boolean from "@fp-ts/schema/data/Boolean"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("Boolean", () => {
  const schema = Boolean.Schema

  it("id", () => {
    expect(Boolean.id).exist
  })

  it("Provider", () => {
    expect(Boolean.Provider).exist
  })

  it("property tests", () => {
    Util.property(Boolean.Schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(true)).toEqual(true)
    expect(guard.is(false)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
  })

  it("UnknownDecoder", () => {
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode(true)).toEqual(D.success(true))
    expect(decoder.decode(false)).toEqual(D.success(false))

    Util.expectFailure(decoder, 1, "1 did not satisfy is(boolean)")
  })

  it("JsonEncoder", () => {
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode(true)).toEqual(true)
    expect(encoder.encode(false)).toEqual(false)
  })
})
