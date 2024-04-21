import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Base64Url", () => {
  const schema = S.Base64Url
  const encoder = new TextEncoder()

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "Zm9vYmFy",
      encoder.encode("foobar")
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      "Pj8-ZD_Dnw",
      encoder.encode(">?>d?ß")
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vY",
      `Base64Url
└─ Transformation process failure
   └─ Length should be a multiple of 4, but is 5`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Pj8/ZD+Dnw",
      `Base64Url
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      encoder.encode("foobar"),
      "Zm9vYmFy"
    )
    await Util.expectEncodeSuccess(
      schema,
      encoder.encode(">?>d?ß"),
      "Pj8-ZD_Dnw"
    )
  })
})
