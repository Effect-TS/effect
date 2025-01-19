import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("StringFromBase64Url", () => {
  const schema = S.StringFromBase64Url

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "Zm9vYmFy",
      "foobar"
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      "Pj8-ZD_Dnw",
      ">?>d?ß"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vY",
      `StringFromBase64Url
└─ Transformation process failure
   └─ Length should be a multiple of 4, but is 5`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Pj8/ZD+Dnw",
      `StringFromBase64Url
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      "foobar",
      "Zm9vYmFy"
    )
    await Util.expectEncodeSuccess(
      schema,
      ">?>d?ß",
      "Pj8-ZD_Dnw"
    )
  })
})
