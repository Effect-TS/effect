import * as Data from "@effect/data/Data"
import * as _ from "@fp-ts/schema/data/Data"
import * as P from "@fp-ts/schema/Parser"
import * as Pretty from "@fp-ts/schema/Pretty"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Data", () => {
  it("data. keyof", () => {
    expect(S.keyof(_.data(S.struct({ a: S.string, b: S.string }))))
      .toEqual(S.union(S.literal("a"), S.literal("b")))

    expect(S.keyof(_.data(S.array(S.string))))
      .toEqual(S.never)
  })

  it("data. property tests", () => {
    Util.property(_.data(S.struct({ a: S.string, b: S.number })))
  })

  it("data. decoder", () => {
    const schema = _.data(S.struct({ a: S.string, b: S.number }))
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

  it("data. encoder", () => {
    const schema = _.data(S.struct({ a: S.string, b: S.number }))
    Util.expectEncodingSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
  })

  it("data. guard", () => {
    const schema = _.data(S.struct({ a: S.string, b: S.number }))
    const is = P.is(schema)
    expect(is(Data.struct({ a: "ok", b: 0 }))).toEqual(true)
    expect(is({ a: "ok", b: 0 })).toEqual(false)
    expect(is(Data.struct({ a: "ok", b: "no" }))).toEqual(false)
  })

  it("data. pretty", () => {
    const schema = _.data(S.struct({ a: S.string, b: S.number }))
    const pretty = Pretty.pretty(schema)
    expect(pretty(Data.struct({ a: "ok", b: 0 }))).toEqual("Data({ \"a\": \"ok\", \"b\": 0 })")
  })

  it("fromStructure. property tests", () => {
    Util.property(_.fromStructure(S.struct({ a: S.string, b: S.number })))
  })

  it("fromStructure. decoder", () => {
    const schema = _.fromStructure(S.struct({ a: S.string, b: S.number }))
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

  it("fromStructure. encoder", () => {
    const schema = _.fromStructure(S.struct({ a: S.string, b: S.number }))
    Util.expectEncodingSuccess(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
