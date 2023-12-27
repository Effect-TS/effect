import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Encoding/Base64", () => {
  const schema = S.Base64
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
    await Util.expectParseFailure(
      schema,
      "Zm9vY",
      "Length must be a multiple of 4, but is 5"
    )
    await Util.expectParseFailure(
      schema,
      "Zm9vYmF-",
      "Invalid character -"
    )
    await Util.expectParseFailure(
      schema,
      "=Zm9vYmF",
      "Found a '=' character, but it is not at the end"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      encoder.encode("foobar"),
      "Zm9vYmFy"
    )
  })
})
