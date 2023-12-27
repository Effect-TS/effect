import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option/optionFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromSelf(S.NumberFromString))
  })

  it("is", () => {
    const schema = S.optionFromSelf(S.number)
    const is = P.is(schema)
    expect(is(O.none())).toEqual(true)
    expect(is(O.some(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(O.some("a"))).toEqual(false)

    expect(is({ _tag: "None" })).toEqual(false)
    expect(is({ _tag: "Some", value: 1 })).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.optionFromSelf(S.NumberFromString)
    await Util.expectParseSuccess(schema, O.none(), O.none())
    await Util.expectParseSuccess(schema, O.some("1"), O.some(1))
  })

  it("pretty", () => {
    const schema = S.optionFromSelf(S.number)
    const pretty = Pretty.to(schema)
    expect(pretty(O.none())).toEqual("none()")
    expect(pretty(O.some(1))).toEqual("some(1)")
  })
})
