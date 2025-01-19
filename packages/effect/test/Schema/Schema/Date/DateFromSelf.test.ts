import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateFromSelf", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.DateFromSelf)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(S.DateFromSelf, new Date(0), new Date(0))
    await Util.expectDecodeUnknownSuccess(S.DateFromSelf, new Date("invalid"))

    await Util.expectDecodeUnknownFailure(
      S.DateFromSelf,
      null,
      `Expected DateFromSelf, actual null`
    )
  })

  it("encoding", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.DateFromSelf, now, now)
    const invalid = new Date("invalid")
    await Util.expectEncodeSuccess(S.DateFromSelf, invalid, invalid)
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.DateFromSelf)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})
