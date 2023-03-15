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

  it("Decoder", () => {
    const schema = S.maxLength(1)(S.string)
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingFailure(
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
