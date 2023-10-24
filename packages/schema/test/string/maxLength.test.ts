import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string/maxLength", () => {
  it("property tests", () => {
    Util.roundtrip(S.maxLength(0)(S.string))
  })

  it("is", () => {
    const is = P.is(S.maxLength(1)(S.string))
    expect(is("")).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.maxLength(1)(S.string)
    await Util.expectParseSuccess(schema, "")
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.to(S.maxLength(0)(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
