import * as _ from "@fp-ts/schema/data/filter"
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
    const schema = _.int(S.number)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, 0.5, `0.5 did not satisfy refinement({"type":"integer"})`)
  })

  it("Pretty", () => {
    const pretty = P.pretty(_.int(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
