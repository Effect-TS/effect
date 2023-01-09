import * as _ from "@fp-ts/schema/data/filter"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("nonNaN", () => {
  it("property tests", () => {
    Util.property(_.nonNaN(S.number))
  })

  it("Guard", () => {
    const is = G.is(_.nonNaN(S.number))
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.nonNaN(S.number))
    Util.expectDecodingSuccess(decoder, 1)
    Util.expectDecodingFailure(decoder, NaN, `NaN did not satisfy refinement({"type":"NonNaN"})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.nonNaN(S.number))
    expect(pretty.pretty(1)).toEqual("1")
    expect(pretty.pretty(NaN)).toEqual("NaN")
  })
})
