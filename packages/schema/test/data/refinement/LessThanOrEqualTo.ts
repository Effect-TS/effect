import * as _ from "@fp-ts/schema/data/refinement"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("lessThanOrEqualTo", () => {
  it("property tests", () => {
    Util.property(_.lessThanOrEqualTo(0)(S.number))
  })

  it("Guard", () => {
    const guard = G.guardFor(_.lessThanOrEqualTo(0)(S.number))
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
    expect(guard.is(-1)).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.lessThanOrEqualTo(0)(S.number))
    Util.expectDecodingSuccess(decoder, 0)
    Util.expectDecodingSuccess(decoder, -1)
    Util.expectDecodingFailure(decoder, 1, `1 did not satisfy refinement({"maximum":0})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.lessThanOrEqualTo(0)(S.number))
    expect(pretty.pretty(1)).toEqual("1")
  })
})
