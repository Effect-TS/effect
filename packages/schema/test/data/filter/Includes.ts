import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("includes", () => {
  it("property tests", () => {
    Util.property(_.includes("a")(S.string))
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
      `"" did not satisfy: String does not include the specified value "a"`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.includes("a")(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
