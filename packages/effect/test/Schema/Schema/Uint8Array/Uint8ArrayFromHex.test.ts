import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uint8ArrayFromHex", () => {
  const schema = S.Uint8ArrayFromHex
  const encoder = new TextEncoder()

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "0001020304050607",
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])
    )
    await Util.assertions.decoding.succeed(
      schema,
      "f0f1f2f3f4f5f6f7",
      Uint8Array.from([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7])
    )
    await Util.assertions.decoding.succeed(
      schema,
      "67",
      encoder.encode("g")
    )
    await Util.assertions.decoding.fail(
      schema,
      "0",
      `Uint8ArrayFromHex
└─ Transformation process failure
   └─ Length must be a multiple of 2, but is 1`
    )
    await Util.assertions.decoding.fail(
      schema,
      "zd4aa",
      `Uint8ArrayFromHex
└─ Transformation process failure
   └─ Length must be a multiple of 2, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "0\x01",
      `Uint8ArrayFromHex
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]),
      "0001020304050607"
    )
  })
})
