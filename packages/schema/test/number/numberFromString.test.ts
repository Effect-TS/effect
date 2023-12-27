import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/NumberFromString", () => {
  const schema = S.NumberFromString

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, "0", 0)
    await Util.expectParseSuccess(schema, "-0", -0)
    await Util.expectParseSuccess(schema, "1", 1)
    await Util.expectParseSuccess(schema, "1.2", 1.2)

    await Util.expectParseSuccess(schema, "NaN", NaN)
    await Util.expectParseSuccess(schema, "Infinity", Infinity)
    await Util.expectParseSuccess(schema, "-Infinity", -Infinity)

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string <-> number transformation, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      " ",
      `Expected a string <-> number transformation, actual " "`
    )
    await Util.expectParseFailure(
      schema,
      "1AB",
      `Expected a string <-> number transformation, actual "1AB"`
    )
    await Util.expectParseFailure(
      schema,
      "AB1",
      `Expected a string <-> number transformation, actual "AB1"`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Expected a string <-> number transformation, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      "a1",
      `Expected a string <-> number transformation, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, "1")
  })
})
