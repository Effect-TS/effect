import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("StringFromHex", () => {
  const schema = S.StringFromHex
  const decoder = new TextDecoder("utf-8")

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "0001020304050607",
      decoder.decode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]))
    )
    await Util.assertions.decoding.succeed(
      schema,
      "f0f1f2f3f4f5f6f7",
      decoder.decode(Uint8Array.from([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7]))
    )
    await Util.assertions.decoding.succeed(
      schema,
      "67",
      "g"
    )
    await Util.assertions.decoding.fail(
      schema,
      "0",
      `StringFromHex
└─ Transformation process failure
   └─ Length must be a multiple of 2, but is 1`
    )
    await Util.assertions.decoding.fail(
      schema,
      "zd4aa",
      `StringFromHex
└─ Transformation process failure
   └─ Length must be a multiple of 2, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "0\x01",
      `StringFromHex
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      decoder.decode(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])),
      "0001020304050607"
    )
  })
})
