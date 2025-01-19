import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("StringFromBase64", () => {
  const schema = S.StringFromBase64

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "Zm9vYmFy",
      "foobar"
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vY",
      `StringFromBase64
└─ Transformation process failure
   └─ Length must be a multiple of 4, but is 5`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "Zm9vYmF-",
      `StringFromBase64
└─ Transformation process failure
   └─ Invalid character -`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "=Zm9vYmF",
      `StringFromBase64
└─ Transformation process failure
   └─ Found a '=' character, but it is not at the end`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      "foobar",
      "Zm9vYmFy"
    )
  })
})
