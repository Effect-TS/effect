import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uint8ArrayFromBase64", () => {
  const schema = S.Uint8ArrayFromBase64
  const encoder = new TextEncoder()

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "Zm9vYmFy",
      encoder.encode("foobar")
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vY",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Length must be a multiple of 4, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vYmF-",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Invalid character -`
    )
    await Util.assertions.decoding.fail(
      schema,
      "=Zm9vYmF",
      `Uint8ArrayFromBase64
└─ Transformation process failure
   └─ Found a '=' character, but it is not at the end`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      encoder.encode("foobar"),
      "Zm9vYmFy"
    )
  })
})
