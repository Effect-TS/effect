import * as _ from "@fp-ts/schema/data/filter/LessThanOrEqualTo"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("LessThanOrEqualTo", () => {
  it("id", () => {
    expect(_.id).exist
  })

  it("Guard", () => {
    const guard = G.guardFor(_.schema(0)(S.number))
    expect(guard.is(0)).toEqual(true)
    expect(guard.is(1)).toEqual(false)
    expect(guard.is(-1)).toEqual(true)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.schema(0)(S.number))
    expect(decoder.decode(0)).toEqual(D.success(0))
    Util.expectFailure(decoder, 1, "1 did not satisfy LessThanOrEqualTo(0)")
    expect(decoder.decode(-1)).toEqual(D.success(-1))
  })
})
