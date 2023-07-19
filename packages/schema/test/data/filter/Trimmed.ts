import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = S.string.pipe(S.trimmed())

describe.concurrent("trimmed", () => {
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
    expect(is("a\nb")).toEqual(true)
    expect(is("a\nb ")).toEqual(false)
    expect(is(" a\nb")).toEqual(false)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "")
    await Util.expectParseFailure(
      schema,
      "a ",
      `Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.expectParseFailure(
      schema,
      " a",
      `Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.expectParseFailure(
      schema,
      " a ",
      `Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("Encoder", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `Expected a string with no leading or trailing whitespace, actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a",
      `Expected a string with no leading or trailing whitespace, actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty("")).toEqual(`""`)
  })
})
