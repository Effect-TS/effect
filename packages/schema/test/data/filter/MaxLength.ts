import * as _ from "@fp-ts/schema/data/filter"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

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
      `"aa" did not satisfy: String cannot exceed 1 characters`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.pretty(_.maxLength(0)(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
