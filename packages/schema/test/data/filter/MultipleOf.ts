import { pipe } from "@effect/data/Function"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("multipleOf", () => {
  it("property tests", () => {
    Util.roundtrip(S.multipleOf(2)(S.number))
  })

  it("Guard", () => {
    const schema = pipe(S.number, S.multipleOf(-.2))
    const is = P.is(schema)
    expect(is(-2.8)).toEqual(true)
    expect(is(-2)).toEqual(true)
    expect(is(-1.5)).toEqual(false)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(2.6)).toEqual(true)
    expect(is(3.1)).toEqual(false)
  })

  it("Decoder", () => {
    const schema = S.multipleOf(2)(S.number)
    Util.expectDecodingSuccess(schema, -4)
    Util.expectDecodingFailure(
      schema,
      -3,
      `Expected a number divisible by 2, actual -3`
    )
    Util.expectDecodingSuccess(schema, 0)
    Util.expectDecodingSuccess(schema, 2)
    Util.expectDecodingFailure(
      schema,
      2.5,
      `Expected a number divisible by 2, actual 2.5`
    )
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected number, actual ""`
    )
  })
})
