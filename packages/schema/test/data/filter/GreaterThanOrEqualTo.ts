import * as _ from "@fp-ts/schema/data/filter/GreaterThanOrEqualTo"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("GreaterThanOrEqualTo", () => {
  it("exports", () => {
    expect(_.id).exist
  })

  it("property tests", () => {
    Util.property(_.schema(0)(S.number))
  })

  it("Guard", () => {
    const guard = G.guardFor(_.schema(0)(S.number))
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(-1)).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.schema(0)(S.number))
    expect(decoder.decode(0)).toEqual(D.success(0))
    expect(decoder.decode(1)).toEqual(D.success(1))
    Util.expectFailure(decoder, -1, "-1 did not satisfy GreaterThanOrEqualTo(0)")
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.schema(0)(S.number))
    expect(pretty.pretty(1)).toEqual("1")
  })
})
