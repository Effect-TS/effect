import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("trim", () => {
  const schema = S.trim(S.string)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("")).toEqual(true)
    expect(is("a ")).toEqual(false)
    expect(is(" a")).toEqual(false)
    expect(is(" a ")).toEqual(false)
    expect(is(" ")).toEqual(false)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseSuccess(schema, "", "")
    await Util.expectParseSuccess(schema, "a ", "a")
    await Util.expectParseSuccess(schema, " a ", "a")
    await Util.expectParseSuccess(schema, " ", "")
  })

  it("Encoder", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeFailure(
      schema,
      " a",
      `Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `Expected a string with no leading or trailing whitespace, actual " a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " ",
      `Expected a string with no leading or trailing whitespace, actual " "`
    )
  })
})
