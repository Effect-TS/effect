import { pipe } from "@effect/data/Function"
import * as _ from "@fp-ts/schema/data/Number"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

const schema = pipe(S.number, _.int())

describe.concurrent("int", () => {
  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 1)
    Util.expectDecodingFailure(schema, 0.5, `Expected integer, actual 0.5`)
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(schema)
    expect(pretty(1)).toEqual("1")
  })
})
