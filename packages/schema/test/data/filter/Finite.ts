import * as p from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.number.pipe(S.finite())

describe.concurrent("finite", () => {
  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Guard", () => {
    const is = p.is(schema)
    expect(is(1)).toEqual(true)
    expect(is(Infinity)).toEqual(false)
    expect(is(-Infinity)).toEqual(false)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, 1)
    await Util.expectParseFailure(
      schema,
      Infinity,
      `Expected a finite number, actual Infinity`
    )
    await Util.expectParseFailure(
      schema,
      -Infinity,
      `Expected a finite number, actual -Infinity`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })
})
