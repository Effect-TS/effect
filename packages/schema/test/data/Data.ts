import * as Data from "@effect/data/Data"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Data", () => {
  it("dataFromSelf. keyof", () => {
    const schema1 = S.keyof(S.dataFromSelf(S.struct({ a: S.string, b: S.string })))
    expect(schema1).toEqual(S.union(S.literal("a"), S.literal("b")))
  })

  it("dataFromSelf. property tests", () => {
    Util.roundtrip(S.dataFromSelf(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.dataFromSelf(S.array(S.number)))
  })

  it("dataFromSelf. decoder", async () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    await Util.expectParseSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.expectParseFailure(
      schema,
      { a: "ok", b: 0 },
      "Expected Data, actual {\"a\":\"ok\",\"b\":0}"
    )
    await Util.expectParseFailure(
      schema,
      Data.struct({ a: "ok", b: "0" }),
      "/b Expected number, actual \"0\""
    )
  })

  it("dataFromSelf. encoder", async () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    await Util.expectEncodeSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
  })

  it("dataFromSelf. guard", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    const is = P.is(schema)
    expect(is(Data.struct({ a: "ok", b: 0 }))).toEqual(true)
    expect(is({ a: "ok", b: 0 })).toEqual(false)
    expect(is(Data.struct({ a: "ok", b: "no" }))).toEqual(false)
  })

  it("dataFromSelf. pretty", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    const pretty = Pretty.to(schema)
    expect(pretty(Data.struct({ a: "ok", b: 0 }))).toEqual("Data({ \"a\": \"ok\", \"b\": 0 })")
  })

  it("data. property tests", () => {
    Util.roundtrip(S.data(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.data(S.array(S.number)))
  })

  it("data. decoder", async () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    await Util.expectParseSuccess(
      schema,
      { a: "ok", b: 0 },
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.expectParseFailure(
      schema,
      { a: "ok", b: "0" },
      "/b Expected number, actual \"0\""
    )
  })

  it("data. encoder", async () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    await Util.expectEncodeSuccess(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
