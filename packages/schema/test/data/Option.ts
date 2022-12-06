import * as O from "@fp-ts/data/Option"
import * as Option from "@fp-ts/schema/data/Option"
import * as D from "@fp-ts/schema/Decoder"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

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

  it("Decoder", () => {
    const schema = Option.schema(S.number)
    const decoder = D.decoderFor(schema)
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

  it("Encoder", () => {
    const schema = Option.schema(S.number)
    const encoder = E.encoderFor(schema)
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
