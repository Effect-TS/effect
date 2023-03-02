import { pipe } from "@effect/data/Function"
import * as _ from "@effect/schema/data/Number"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = pipe(S.number, _.nonNaN())

describe.concurrent("nonNaN", () => {
  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, NaN, `Expected a number NaN excluded, actual NaN`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
  })
})
