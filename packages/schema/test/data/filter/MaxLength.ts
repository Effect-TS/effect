import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("maxLength", () => {
  it("property tests", () => {
    Util.roundtrip(S.maxLength(0)(S.string))
  })

  it("Guard", () => {
    const is = P.is(S.maxLength(1)(S.string))
    expect(is("")).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(false)
  })

  it("Decoder", async () => {
    const schema = S.maxLength(1)(S.string)
    await Util.expectParseSuccess(schema, "")
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.to(S.maxLength(0)(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
