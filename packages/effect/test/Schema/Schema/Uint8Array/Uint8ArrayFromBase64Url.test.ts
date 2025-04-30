import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uint8ArrayFromBase64Url", () => {
  const schema = S.Uint8ArrayFromBase64Url
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
    await Util.assertions.decoding.succeed(
      schema,
      "Pj8-ZD_Dnw",
      encoder.encode(">?>d?ß")
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vY",
      `Uint8ArrayFromBase64Url
└─ Transformation process failure
   └─ Length should be a multiple of 4, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "Pj8/ZD+Dnw",
      `Uint8ArrayFromBase64Url
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      encoder.encode("foobar"),
      "Zm9vYmFy"
    )
    await Util.assertions.encoding.succeed(
      schema,
      encoder.encode(">?>d?ß"),
      "Pj8-ZD_Dnw"
    )
  })
})
