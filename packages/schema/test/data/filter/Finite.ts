import * as _ from "@fp-ts/schema/data/filter"
import * as p from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("finite", () => {
  it("property tests", () => {
    Util.property(_.finite(S.number))
  })

  it("Guard", () => {
    const is = p.is(_.finite(S.number))
    expect(is(1)).toEqual(true)
    expect(is(Infinity)).toEqual(false)
    expect(is(-Infinity)).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.finite(S.number)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(
      schema,
      Infinity,
      `Infinity did not satisfy: Number must be finite`
    )
    Util.expectDecodingFailure(
      schema,
      -Infinity,
      `-Infinity did not satisfy: Number must be finite`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.finite(S.number))
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
    expect(pretty(Infinity)).toEqual("Infinity")
    expect(pretty(-Infinity)).toEqual("-Infinity")
  })
})
