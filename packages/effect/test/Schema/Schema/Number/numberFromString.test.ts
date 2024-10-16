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
   └─ Expected NumberFromString, actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual " "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1AB",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "1AB"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "AB1",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "AB1"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `NumberFromString
└─ Transformation process failure
   └─ Expected NumberFromString, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
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
