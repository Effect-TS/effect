import * as parseFloat from "@fp-ts/schema/data/parser/parseFloat"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("parseFloat", () => {
  const schema = parseFloat.schema(S.string)

  it("id", () => {
    expect(parseFloat.id).exist
  })

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const guard = G.guardFor(schema)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is("a")).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(schema)
    expect(decoder.decode("1")).toEqual(D.success(1))
    expect(decoder.decode("1a")).toEqual(D.success(1))
    Util.expectFailure(decoder, "a", "\"a\" \"cannot be converted to a number by parseFloat\"")
    Util.expectFailure(decoder, "a1", "\"a1\" \"cannot be converted to a number by parseFloat\"")
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    expect(encoder.encode(1)).toEqual("1")
  })
})
