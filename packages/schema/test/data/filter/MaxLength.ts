import * as _ from "@effect/schema/data/String"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("maxLength", () => {
  it("property tests", () => {
    Util.property(_.maxLength(0)(S.string))
  })

  it("Guard", () => {
    const is = P.is(_.maxLength(1)(S.string))
    expect(is("")).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(false)
  })

  it("Decoder", () => {
    const schema = _.maxLength(1)(S.string)
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingFailure(
      schema,
      "aa",
      `Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.maxLength(0)(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
