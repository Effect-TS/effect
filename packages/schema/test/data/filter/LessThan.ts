import * as _ from "@fp-ts/schema/data/Number"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("lessThan", () => {
  it("property tests", () => {
    Util.property(_.lessThan(0)(S.number))
  })

  it("Guard", () => {
    const is = P.is(_.lessThan(0)(S.number))
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("Decoder", () => {
    const schema = _.lessThan(0)(S.number)
    Util.expectDecodingSuccess(schema, -1)
    Util.expectDecodingFailure(schema, 0, `Expected a number less than 0, actual 0`)
    Util.expectDecodingFailure(schema, 1, `Expected a number less than 0, actual 1`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.lessThan(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
