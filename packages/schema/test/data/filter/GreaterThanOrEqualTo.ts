import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("greaterThanOrEqualTo", () => {
  it("property tests", () => {
    Util.property(_.greaterThanOrEqualTo(0)(S.number))
  })

  it("Guard", () => {
    const is = P.is(_.greaterThanOrEqualTo(0)(S.number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.greaterThanOrEqualTo(0)(S.number)
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, -1, `-1 did not satisfy refinement({"minimum":0})`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.greaterThanOrEqualTo(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
