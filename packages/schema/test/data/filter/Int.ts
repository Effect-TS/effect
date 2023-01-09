import * as _ from "@fp-ts/schema/data/filter"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("int", () => {
  it("property tests", () => {
    Util.property(_.int(S.number))
  })

  it("Guard", () => {
    const is = G.is(_.int(S.number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.int(S.number))
    Util.expectDecodingSuccess(decoder, 0)
    Util.expectDecodingSuccess(decoder, 1)
    Util.expectDecodingFailure(decoder, 0.5, `0.5 did not satisfy refinement({"type":"integer"})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.int(S.number))
    expect(pretty.pretty(1)).toEqual("1")
  })
})
