import * as _ from "@effect/schema/data/Date"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Date", () => {
  it("date. keyof", () => {
    expect(S.keyof(_.date)).toEqual(S.never)
  })

  it("date. property tests", () => {
    Util.property(_.date)
  })

  it("date. decoder", () => {
    Util.expectDecodingSuccess(_.date, new Date(), new Date())

    Util.expectDecodingFailure(_.date, null, `Expected Date, actual null`)
  })

  it("date. encoder", () => {
    const now = new Date()
    Util.expectEncodingSuccess(_.date, now, now)
  })

  it("date. guard", () => {
    const is = P.is(_.date)
    expect(is(new Date())).toEqual(true)

    expect(is(1)).toEqual(false)
  })

  it("date. pretty", () => {
    const pretty = Pretty.pretty(_.date)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})
