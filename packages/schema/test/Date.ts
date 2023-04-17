import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("DateFromSelf", () => {
  it("keyof", () => {
    expect(S.keyof(S.DateFromSelf)).toEqual(S.never)
  })

  it("property tests", () => {
    Util.roundtrip(S.DateFromSelf)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(S.DateFromSelf, new Date(), new Date())

    await Util.expectParseFailure(S.DateFromSelf, null, `Expected Date, actual null`)
  })

  it("Encoder", async () => {
    const now = new Date()
    await Util.expectEncodeSuccess(S.DateFromSelf, now, now)
  })

  it("Pretty", () => {
    const pretty = Pretty.to(S.DateFromSelf)
    expect(pretty(new Date(0))).toEqual("new Date(\"1970-01-01T00:00:00.000Z\")")
  })
})

describe.concurrent("Date", () => {
  const schema = S.Date

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
