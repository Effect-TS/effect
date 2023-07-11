import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.number.pipe(S.int())

describe.concurrent("int", () => {
  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, 0)
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(schema, 0.5, `Expected integer, actual 0.5`)
  })

  it("Pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty(1)).toEqual("1")
  })
})
