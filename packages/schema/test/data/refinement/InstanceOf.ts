import * as _ from "@fp-ts/schema/data/refinement"
import * as D from "@fp-ts/schema/Decoder"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("instanceOf", () => {
  it("Guard", () => {
    const guard = G.guardFor(_.instanceOf(Set)(S.object))
    expect(guard.is(new Set())).toEqual(true)
    expect(guard.is(1)).toEqual(false)
    expect(guard.is({})).toEqual(false)
  })

  it("Decoder", () => {
    const decoder = D.decoderFor(_.instanceOf(Set)(S.object))
    Util.expectDecodingSuccess(decoder, new Set())
    Util.expectDecodingFailure(decoder, 1, `1 did not satisfy is(object)`)
    Util.expectDecodingFailure(decoder, {}, `{} did not satisfy refinement({"instanceof":"Set"})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.instanceOf(Set)(S.object))
    expect(pretty.pretty(new Set())).toEqual("{}")
  })
})
