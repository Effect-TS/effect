import * as _ from "@effect/schema/data/String"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("includes", () => {
  it("property tests", () => {
    Util.property(S.includes("a")(S.string))
  })

  it("Guard", () => {
    const is = P.is(_.includes("a")(S.string))
    expect(is("")).toEqual(false)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)
    expect(is("bac")).toEqual(true)
    expect(is("ba")).toEqual(true)
  })

  it("Decoder", () => {
    const schema = _.includes("a")(S.string)
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "aa")
    Util.expectDecodingSuccess(schema, "bac")
    Util.expectDecodingSuccess(schema, "ba")
    Util.expectDecodingFailure(
      schema,
      "",
      `Expected a string including "a", actual ""`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.includes("a")(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
