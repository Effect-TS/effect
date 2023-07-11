import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.number.pipe(S.nonNaN())

describe.concurrent("nonNaN", () => {
  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(false)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(schema, NaN, `Expected a number NaN excluded, actual NaN`)
  })

  it("Pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
  })
})
