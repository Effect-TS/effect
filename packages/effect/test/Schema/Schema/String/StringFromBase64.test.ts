import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("StringFromBase64", () => {
  const schema = S.StringFromBase64

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "Zm9vYmFy",
      "foobar"
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vY",
      `StringFromBase64
└─ Transformation process failure
   └─ Length must be a multiple of 4, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vYmF-",
      `StringFromBase64
└─ Transformation process failure
   └─ Invalid character -`
    )
    await Util.assertions.decoding.fail(
      schema,
      "=Zm9vYmF",
      `StringFromBase64
└─ Transformation process failure
   └─ Found a '=' character, but it is not at the end`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      "foobar",
      "Zm9vYmFy"
    )
  })
})
