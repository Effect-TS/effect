import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.DateFromSelf)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(S.DateFromSelf, new Date(), new Date())
    await Util.expectDecodeUnknownSuccess(S.DateFromSelf, new Date("invalid"), new Date("invalid"))

    await Util.expectDecodeUnknownFailure(
      S.DateFromSelf,
      null,
      `Expected DateFromSelf (a potentially invalid Date instance), actual null`
    )
  })

  it("encoding", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.DateFromSelf, now, now)
    await Util.expectEncodeSuccess(S.DateFromSelf, new Date("invalid"), new Date("invalid"))
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.DateFromSelf)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})
