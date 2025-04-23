import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("StringFromBase64Url", () => {
  const schema = S.StringFromBase64Url

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "Zm9vYmFy",
      "foobar"
    )
    await Util.assertions.decoding.succeed(
      schema,
      "Pj8-ZD_Dnw",
      ">?>d?ß"
    )
    await Util.assertions.decoding.fail(
      schema,
      "Zm9vY",
      `StringFromBase64Url
└─ Transformation process failure
   └─ Length should be a multiple of 4, but is 5`
    )
    await Util.assertions.decoding.fail(
      schema,
      "Pj8/ZD+Dnw",
      `StringFromBase64Url
└─ Transformation process failure
   └─ Invalid input`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      "foobar",
      "Zm9vYmFy"
    )
    await Util.assertions.encoding.succeed(
      schema,
      ">?>d?ß",
      "Pj8-ZD_Dnw"
    )
  })
})
