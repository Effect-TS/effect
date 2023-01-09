import * as _ from "@fp-ts/schema/data/filter"
import * as G from "@fp-ts/schema/Guard"
import * as P from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("includes", () => {
  it("property tests", () => {
    Util.property(_.includes("a")(S.string))
  })

  it("Guard", () => {
    const is = G.is(_.includes("a")(S.string))
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
    Util.expectDecodingFailure(schema, "", `"" did not satisfy refinement({"includes":"a"})`)
  })

  it("Pretty", () => {
    const pretty = P.prettyFor(_.includes("a")(S.string))
    expect(pretty.pretty("a")).toEqual(`"a"`)
  })
})
