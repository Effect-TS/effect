import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("URLFromSelf", () => {
  const schema = S.URLFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(S.RedactedFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      new URL("https://effect.website"),
      new URL("https://effect.website")
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      new URL("https://effect.website"),
      new URL("https://effect.website")
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(new URL("https://effect.website"))).toEqual(`https://effect.website/`)
  })
})
