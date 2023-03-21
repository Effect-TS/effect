import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("lessThan", () => {
  it("property tests", () => {
    Util.roundtrip(S.lessThan(0)(S.number))
  })

  it("Guard", () => {
    const is = P.is(S.lessThan(0)(S.number))
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("Decoder", async () => {
    const schema = S.lessThan(0)(S.number)
    await Util.expectParseSuccess(schema, -1)
    await Util.expectParseFailure(schema, 0, `Expected a number less than 0, actual 0`)
    await Util.expectParseFailure(schema, 1, `Expected a number less than 0, actual 1`)
  })

  it("Pretty", () => {
    const pretty = Pretty.to(S.lessThan(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
