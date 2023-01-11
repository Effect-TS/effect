import { parseNumber } from "@fp-ts/schema/data/parser"
import * as P from "@fp-ts/schema/Parser"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("parseNumber", () => {
  const schema = parseNumber(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, "1", 1)
    Util.expectDecodingSuccess(schema, "1a", 1)
    Util.expectDecodingFailure(
      schema,
      "a",
      `"a" must be parsable from a string to a number`
    )
    Util.expectDecodingFailure(
      schema,
      "a1",
      `"a1" must be parsable from a string to a number`
    )
  })

  it("Encoder", () => {
    Util.expectEncodingSuccess(schema, 1, "1")
  })

  it("example", () => {
    const schema = parseNumber(S.string) // converts string schema to number schema

    // success cases
    Util.expectDecodingSuccess(schema, "1", 1)
    Util.expectDecodingSuccess(schema, "-1", -1)
    Util.expectDecodingSuccess(schema, "1.5", 1.5)
    Util.expectDecodingSuccess(schema, "NaN", NaN)
    Util.expectDecodingSuccess(schema, "Infinity", Infinity)
    Util.expectDecodingSuccess(schema, "-Infinity", -Infinity)

    // failure cases
    Util.expectDecodingFailure(
      schema,
      "a",
      `"a" must be parsable from a string to a number`
    )
  })
})
