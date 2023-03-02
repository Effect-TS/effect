import { parseDate } from "@effect/schema/data/String"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("parseDate", () => {
  const schema = parseDate(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = P.is(schema)
    expect(is(new Date())).toEqual(true)
    expect(is("0")).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(
      schema,
      "1970-01-01T00:00:00.000Z",
      new Date(0)
    )
    Util.expectDecodingFailure(
      schema,
      "a",
      `Expected a parsable value from string to Date, actual "a"`
    )
    Util.expectDecodingFailure(
      schema,
      "a1",
      `Expected a parsable value from string to Date, actual "a1"`
    )
  })

  it("Encoder", () => {
    Util.expectEncodingSuccess(schema, new Date(0), "1970-01-01T00:00:00.000Z")
  })

  it("example", () => {
    const schema = parseDate(S.string) // converts string schema to date schema

    // success cases
    Util.expectDecodingSuccess(schema, "0", new Date("0"))
    Util.expectDecodingSuccess(schema, "1970-01-01T00:00:00.000Z", new Date(0))
    Util.expectDecodingSuccess(schema, "2000-10-01", new Date("2000-10-01"))

    // failure cases
    Util.expectDecodingFailure(
      schema,
      "a",
      `Expected a parsable value from string to Date, actual "a"`
    )
  })
})
