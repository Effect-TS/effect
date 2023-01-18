import { pipe } from "@fp-ts/data/Function"
import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("multipleOf", () => {
  it("property tests", () => {
    Util.property(_.minLength(0)(S.string))
  })

  it("Guard", () => {
    const schema = pipe(S.number, _.multipleOf(2))
    const is = P.is(schema)
    expect(is(-2)).toEqual(true)
    expect(is(-1)).toEqual(false)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is(2)).toEqual(true)
  })

  it("Decoder", () => {
    const schema = _.multipleOf(.2)(S.number)
    Util.expectDecodingSuccess(schema, 2)
    Util.expectDecodingSuccess(schema, -.4)
    Util.expectDecodingFailure(
      schema,
      3.1,
      `Expected a number divisible by 0.2, actual 3.1`
    )
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected number, actual ""`
    )
  })
})
