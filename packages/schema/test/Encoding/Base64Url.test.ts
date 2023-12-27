import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Encoding/Base64Url", () => {
  const schema = S.Base64Url
  const encoder = new TextEncoder()

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      "Zm9vYmFy",
      encoder.encode("foobar")
    )
    await Util.expectParseSuccess(
      schema,
      "Pj8-ZD_Dnw",
      encoder.encode(">?>d?ß")
    )
    await Util.expectParseFailure(
      schema,
      "Zm9vY",
      "Length should be a multiple of 4, but is 5"
    )
    await Util.expectParseFailure(
      schema,
      "Pj8/ZD+Dnw",
      "Invalid input"
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
