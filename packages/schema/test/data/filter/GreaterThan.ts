import * as _ from "@fp-ts/schema/data/filter"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("greaterThan", () => {
  it("property tests", () => {
    Util.property(_.greaterThan(0)(S.number))
  })

  it("Guard", () => {
    const is = G.is(_.greaterThan(0)(S.number))
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.greaterThan(0)(S.number)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, 0, `0 did not satisfy refinement({"exclusiveMinimum":0})`)
    Util.expectDecodingFailure(schema, -1, `-1 did not satisfy refinement({"exclusiveMinimum":0})`)
  })

  it("Pretty", () => {
    const pretty = P.pretty(_.greaterThan(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
