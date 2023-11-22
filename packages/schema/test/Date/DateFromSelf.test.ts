import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Date/DateFromSelf", () => {
  it("keyof", () => {
    expect(S.keyof(S.DateFromSelf)).toEqual(S.never)
  })

  it("property tests", () => {
    Util.roundtrip(S.DateFromSelf)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(S.DateFromSelf, new Date(), new Date())
    await Util.expectParseSuccess(S.DateFromSelf, new Date("invalid"), new Date("invalid"))

    await Util.expectParseFailure(S.DateFromSelf, null, `Expected Date, actual null`)
  })

  it("encoding", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.DateFromSelf, now, now)
    await Util.expectEncodeSuccess(S.DateFromSelf, new Date("invalid"), new Date("invalid"))
  })

  it("pretty", () => {
    const pretty = Pretty.to(S.DateFromSelf)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})
