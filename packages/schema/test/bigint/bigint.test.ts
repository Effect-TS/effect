import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > bigint", () => {
  const schema = S.bigint

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, "0", 0n)
    await Util.expectParseSuccess(schema, "-0", -0n)
    await Util.expectParseSuccess(schema, "1", 1n)

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a string <-> bigint transformation, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      " ",
      `Expected a string <-> bigint transformation, actual " "`
    )
    await Util.expectParseFailure(
      schema,
      "1.2",
      `Expected a string <-> bigint transformation, actual "1.2"`
    )
    await Util.expectParseFailure(
      schema,
      "1AB",
      `Expected a string <-> bigint transformation, actual "1AB"`
    )
    await Util.expectParseFailure(
      schema,
      "AB1",
      `Expected a string <-> bigint transformation, actual "AB1"`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Expected a string <-> bigint transformation, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      "a1",
      `Expected a string <-> bigint transformation, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, "1")
  })
})
