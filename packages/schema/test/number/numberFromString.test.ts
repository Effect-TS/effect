import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > NumberFromString", () => {
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
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      " ",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual " "`
    )
    await Util.expectParseFailure(
      schema,
      "1AB",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "1AB"`
    )
    await Util.expectParseFailure(
      schema,
      "AB1",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "AB1"`
    )
    await Util.expectParseFailure(
      schema,
      "a",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectParseFailure(
      schema,
      "a1",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, "1")
  })
})
