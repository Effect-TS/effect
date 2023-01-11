import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("int", () => {
  it("property tests", () => {
    Util.property(_.int(S.number))
  })

  it("Guard", () => {
    const is = P.is(_.int(S.number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.int(S.number)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, 0.5, `0.5 must be an integer`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.int(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
