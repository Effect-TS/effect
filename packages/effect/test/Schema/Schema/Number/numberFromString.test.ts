import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NumberFromString", () => {
  const schema = S.NumberFromString

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "0", 0)
    await Util.expectDecodeUnknownSuccess(schema, "-0", -0)
    await Util.expectDecodeUnknownSuccess(schema, "1", 1)
    await Util.expectDecodeUnknownSuccess(schema, "1.2", 1.2)

    await Util.expectDecodeUnknownSuccess(schema, "NaN", NaN)
    await Util.expectDecodeUnknownSuccess(schema, "Infinity", Infinity)
    await Util.expectDecodeUnknownSuccess(schema, "-Infinity", -Infinity)

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "" into a number`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode " " into a number`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1AB",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "1AB" into a number`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "AB1",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "AB1" into a number`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "a" into a number`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a1",
      `NumberFromString
└─ Transformation process failure
   └─ Unable to decode "a1" into a number`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, "1")
  })
})
