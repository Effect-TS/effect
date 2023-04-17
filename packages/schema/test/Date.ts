import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("date", () => {
  it("keyof", () => {
    expect(S.keyof(S.date)).toEqual(S.never)
  })

  it("property tests", () => {
    Util.roundtrip(S.date)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(S.date, new Date(), new Date())

    await Util.expectParseFailure(S.date, null, `Expected Date, actual null`)
  })

  it("Encoder", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.date, now, now)
  })

  it("Pretty", () => {
    const pretty = Pretty.to(S.date)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})

describe.concurrent("DateFromString", () => {
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
      `Expected a valid Date, actual Invalid Date`
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
})
