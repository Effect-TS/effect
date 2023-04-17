import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Date", () => {
  it("date. keyof", () => {
    expect(S.keyof(S.date)).toEqual(S.never)
  })

  it("date. property tests", () => {
    Util.roundtrip(S.date)
  })

  it("date. decoder", async () => {
    await Util.expectParseSuccess(S.date, new Date(), new Date())

    await Util.expectParseFailure(S.date, null, `Expected Date, actual null`)
  })

  it("date. encoder", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.date, now, now)
  })

  it("date. guard", () => {
    const is = P.is(S.date)
    expect(is(new Date())).toEqual(true)

    expect(is(1)).toEqual(false)
  })

  it("date. pretty", () => {
    const pretty = Pretty.to(S.date)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })

  describe.concurrent("dateFromString", () => {
    const schema = S.DateFromString

    it("property tests", () => {
      Util.roundtrip(schema)
    })

    it("Decoder", async () => {
      await Util.expectParseSuccess(
        schema,
        "1970-01-01T00:00:00.000Z",
        new Date(0)
      )
      await Util.expectParseFailure(
        schema,
        "a",
        `Expected string -> a valid Date, actual "a"`
      )
      await Util.expectParseFailure(
        schema,
        "a1",
        `Expected string -> a valid Date, actual "a1"`
      )
    })

    it("Encoder", async () => {
      await Util.expectEncodeSuccess(schema, new Date(0), "1970-01-01T00:00:00.000Z")
      await Util.expectEncodeFailure(
        schema,
        new Date("fail"),
        "Expected a valid Date, actual Invalid Date"
      )
    })

    it("example", async () => {
      const schema = S.DateFromString

      // success cases
      await Util.expectParseSuccess(schema, "0", new Date("0"))
      await Util.expectParseSuccess(schema, "1970-01-01T00:00:00.000Z", new Date(0))
      await Util.expectParseSuccess(schema, "2000-10-01", new Date("2000-10-01"))

      // failure cases
      await Util.expectParseFailure(
        schema,
        "a",
        `Expected string -> a valid Date, actual "a"`
      )
    })
  })
})
