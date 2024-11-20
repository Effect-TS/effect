import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("URL", () => {
  const schema = S.URL

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(S.URL)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "http://effect.website",
      new URL("http://effect.website")
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "123",
      `URL
└─ Transformation process failure
   └─ Expected URL, actual "123"`
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      new URL("https://effecty.website"),
      "https://effecty.website/"
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    const input = "https://effecty.website:443"
    const prettified = "https://effecty.website/"
    expect(pretty(new URL(input))).toEqual(prettified)
  })
})
