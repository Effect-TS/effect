import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint/bigint", () => {
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
      `Expected <anonymous transformation string <-> bigint>, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      " ",
      `Expected <anonymous transformation string <-> bigint>, actual " "`
    )
    await Util.expectParseFailure(
      schema,
      "1.2",
      `Expected <anonymous transformation string <-> bigint>, actual "1.2"`
    )
    await Util.expectParseFailure(
      schema,
      "1AB",
      `Expected <anonymous transformation string <-> bigint>, actual "1AB"`
    )
    await Util.expectParseFailure(
      schema,
      "AB1",
      `Expected <anonymous transformation string <-> bigint>, actual "AB1"`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `Expected <anonymous transformation string <-> bigint>, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      "a1",
      `Expected <anonymous transformation string <-> bigint>, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, "1")
  })
})
