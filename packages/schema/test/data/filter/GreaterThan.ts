import * as _ from "@fp-ts/schema/data/filter/GreaterThan"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe("GreaterThan", () => {
  it("id", () => {
    expect(_.id).exist
  })

  it("Guard", () => {
    const guard = G.guardFor(_.schema(0)(S.number))
    expect(guard.is(0)).toEqual(false)
    expect(guard.is(1)).toEqual(true)
    expect(guard.is(-1)).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.schema(0)(S.number))
    Util.expectFailure(decoder, 0, "0 did not satisfy GreaterThan(0)")
    expect(decoder.decode(1)).toEqual(D.success(1))
    Util.expectFailure(decoder, -1, "-1 did not satisfy GreaterThan(0)")
  })
})
