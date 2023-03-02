import { pipe } from "@effect/data/Function"
import * as p from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = pipe(S.number, S.finite())

describe.concurrent("finite", () => {
  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = p.is(schema)
    expect(is(1)).toEqual(true)
    expect(is(Infinity)).toEqual(false)
    expect(is(-Infinity)).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(
      schema,
      Infinity,
      `Expected a finite number, actual Infinity`
    )
    Util.expectDecodingFailure(
      schema,
      -Infinity,
      `Expected a finite number, actual -Infinity`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })
})
