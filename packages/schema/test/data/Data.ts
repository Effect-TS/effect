import * as Data from "@effect/data/Data"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Data", () => {
  it("dataFromSelf. keyof", () => {
    expect(S.keyof(S.dataFromSelf(S.struct({ a: S.string, b: S.string }))))
      .toEqual(S.union(S.literal("a"), S.literal("b")))

    expect(S.keyof(S.dataFromSelf(S.array(S.string))))
      .toEqual(S.never)
  })

  it("dataFromSelf. property tests", () => {
    Util.roundtrip(S.dataFromSelf(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.dataFromSelf(S.array(S.number)))
  })

  it("dataFromSelf. decoder", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    Util.expectDecodingSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
    Util.expectDecodingFailure(
      schema,
      { a: "ok", b: 0 },
      "Expected Data, actual {\"a\":\"ok\",\"b\":0}"
    )
    Util.expectDecodingFailure(
      schema,
      Data.struct({ a: "ok", b: "0" }),
      "/b Expected number, actual \"0\""
    )
  })

  it("dataFromSelf. encoder", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    Util.expectEncodingSuccess(
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

  it("data. decoder", () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    Util.expectDecodingSuccess(
      schema,
      { a: "ok", b: 0 },
      Data.struct({ a: "ok", b: 0 })
    )
    Util.expectDecodingFailure(
      schema,
      { a: "ok", b: "0" },
      "/b Expected number, actual \"0\""
    )
  })

  it("data. encoder", () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    Util.expectEncodingSuccess(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
