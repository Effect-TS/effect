import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Encoding/Hex", () => {
  const schema = S.Hex
  const encoder = new TextEncoder()

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      "0001020304050607",
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])
    )
    await Util.expectParseSuccess(
      schema,
      "f0f1f2f3f4f5f6f7",
      Uint8Array.from([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7])
    )
    await Util.expectParseSuccess(
      schema,
      "67",
      encoder.encode("g")
    )
    await Util.expectParseFailure(
      schema,
      "0",
      "Length must be a multiple of 2, but is 1"
    )
    await Util.expectParseFailure(
      schema,
      "zd4aa",
      "Length must be a multiple of 2, but is 5"
    )
    await Util.expectParseFailure(
      schema,
      "0\x01",
      "Invalid input"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]),
      "0001020304050607"
    )
  })
})
