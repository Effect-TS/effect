import * as O from "@fp-ts/data/Option"
import * as Option from "@fp-ts/schema/data/Option"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as JE from "@fp-ts/schema/JsonEncoder"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"
import * as UD from "@fp-ts/schema/UnknownDecoder"

describe("Option", () => {
  it("id", () => {
    expect(Option.id).exist
  })

  it("Provider", () => {
    expect(Option.Provider).exist
  })

  it("property tests", () => {
    Util.property(Option.schema(S.number))
  })

  it("guard", () => {
    const schema = Option.schema(S.string)
    const guard = G.guardFor(schema)
    expect(guard.is(O.none)).toEqual(true)
    expect(guard.is(O.some("a"))).toEqual(true)

    expect(guard.is(O.some(1))).toEqual(false)
  })

  it("unknownDecoder", () => {
    const schema = Option.schema(S.number)
    const decoder = UD.unknownDecoderFor(schema)
    expect(decoder.decode(null)).toEqual(D.success(O.none))
    expect(decoder.decode(1)).toEqual(
      D.success(O.some(1))
    )
    // should handle warnings
    Util.expectWarning(
      decoder,
      NaN,
      "did not satisfy not(isNaN)",
      O.some(NaN)
    )
    Util.expectFailure(
      decoder,
      "a",
      "member 0 \"a\" did not satisfy isEqual(null), member 1 \"a\" did not satisfy is(number)"
    )
  })

  it("jsonEncoder", () => {
    const schema = Option.schema(S.number)
    const encoder = JE.jsonEncoderFor(schema)
    expect(encoder.encode(O.none)).toEqual(null)
    expect(encoder.encode(O.some(1))).toEqual(1)
  })

  it("pretty", () => {
    const schema = Option.schema(S.number)
    const pretty = P.prettyFor(schema)
    expect(pretty.pretty(O.none)).toEqual("none")
    expect(pretty.pretty(O.some(1))).toEqual("some(1)")
  })
})
