import { pipe } from "@effect/data/Function"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const schema = pipe(S.string, S.trimmed())

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
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, "a")
    Util.expectDecodingSuccess(schema, "")
    Util.expectDecodingFailure(
      schema,
      "a ",
      `Expected a string with no leading or trailing whitespace, actual "a "`
    )
    Util.expectDecodingFailure(
      schema,
      " a",
      `Expected a string with no leading or trailing whitespace, actual " a"`
    )
    Util.expectDecodingFailure(
      schema,
      " a ",
      `Expected a string with no leading or trailing whitespace, actual " a "`
    )
  })

  it("Encoder", () => {
    Util.expectEncodingSuccess(schema, "a", "a")
    Util.expectEncodingSuccess(schema, "", "")
    Util.expectEncodingFailure(
      schema,
      "a ",
      `Expected a string with no leading or trailing whitespace, actual "a "`
    )
    Util.expectEncodingFailure(
      schema,
      " a",
      `Expected a string with no leading or trailing whitespace, actual " a"`
    )
    Util.expectEncodingFailure(
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
