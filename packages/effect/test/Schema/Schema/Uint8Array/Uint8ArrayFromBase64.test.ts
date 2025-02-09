import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Uint8ArrayFromBase64", () => {
  const schema = S.Uint8ArrayFromBase64
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
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vY",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Length must be a multiple of 4, but is 5`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vYmF-",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Invalid character -`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "=Zm9vYmF",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Found a '=' character, but it is not at the end`
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
