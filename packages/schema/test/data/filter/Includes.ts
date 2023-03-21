import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("includes", () => {
  it("property tests", () => {
    Util.roundtrip(S.includes("a")(S.string))
  })

  it("Guard", () => {
    const is = P.is(S.includes("a")(S.string))
    expect(is("")).toEqual(false)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)
    expect(is("bac")).toEqual(true)
    expect(is("ba")).toEqual(true)
  })

  it("Decoder", async () => {
    const schema = S.includes("a")(S.string)
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "aa")
    await Util.expectParseSuccess(schema, "bac")
    await Util.expectParseSuccess(schema, "ba")
    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string including "a", actual ""`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.to(S.includes("a")(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})
