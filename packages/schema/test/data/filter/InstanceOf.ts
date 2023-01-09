import * as _ from "@fp-ts/schema/data/filter"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("instanceOf", () => {
  it("Guard", () => {
    const is = G.is(_.instanceOf(Set)(S.object))
    expect(is(new Set())).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is({})).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.instanceOf(Set)(S.object)
    Util.expectDecodingSuccess(schema, new Set())
    Util.expectDecodingFailure(schema, 1, `1 did not satisfy is(object)`)
    Util.expectDecodingFailure(schema, {}, `{} did not satisfy refinement({"instanceof":"Set"})`)
  })

  it("Pretty", () => {
    const pretty = P.pretty(_.instanceOf(Set)(S.object))
    expect(pretty(new Set())).toEqual("{}")
  })
})
