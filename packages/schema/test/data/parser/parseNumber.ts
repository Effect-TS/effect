import { parseNumber } from "@fp-ts/schema/data/parser"
import * as E from "@fp-ts/schema/Encoder"
import * as G from "@fp-ts/schema/Guard"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("parseNumber", () => {
  const schema = parseNumber(S.string)

  it("property tests", () => {
    Util.property(schema)
  })

  it("Guard", () => {
    const is = G.is(schema)
    expect(is(1)).toEqual(true)
    expect(is("a")).toEqual(false)
  })

  it("Decoder", () => {
    Util.expectDecodingSuccess(schema, "1", 1)
    Util.expectDecodingSuccess(schema, "1a", 1)
    Util.expectDecodingFailure(
      schema,
      "a",
      `"a" did not satisfy parsing from (string) to (number)`
    )
    Util.expectDecodingFailure(
      schema,
      "a1",
      `"a1" did not satisfy parsing from (string) to (number)`
    )
  })

  it("Encoder", () => {
    const encoder = E.encoderFor(schema)
    Util.expectEncodingSuccess(encoder, 1, "1")
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
    Util.expectDecodingFailure(schema, "a", `"a" did not satisfy parsing from (string) to (number)`)
  })
})
