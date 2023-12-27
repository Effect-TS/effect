import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("number/lessThan", () => {
  it("property tests", () => {
    Util.roundtrip(S.lessThan(0)(S.number))
  })

  it("is", () => {
    const is = P.is(S.lessThan(0)(S.number))
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("decoding", async () => {
    const schema = S.lessThan(0)(S.number)
    await Util.expectParseSuccess(schema, -1)
    await Util.expectParseFailure(schema, 0, `Expected a negative number, actual 0`)
    await Util.expectParseFailure(schema, 1, `Expected a negative number, actual 1`)
  })

  it("pretty", () => {
    const pretty = Pretty.to(S.lessThan(0)(S.number))
    expect(pretty(1)).toEqual("1")
  })
})
