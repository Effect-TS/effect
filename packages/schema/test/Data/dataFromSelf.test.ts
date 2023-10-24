import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Data from "effect/Data"
import { describe, expect, it } from "vitest"

describe("Data/dataFromSelf", () => {
  it("keyof", () => {
    const schema1 = S.keyof(S.dataFromSelf(S.struct({ a: S.string, b: S.string })))
    expect(schema1).toEqual(S.union(S.literal("a"), S.literal("b")))
  })

  it("property tests", () => {
    Util.roundtrip(S.dataFromSelf(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.dataFromSelf(S.array(S.number)))
  })

  it("decoding", async () => {
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

  it("encoding", async () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    await Util.expectEncodeSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
  })

  it("is", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    const is = P.is(schema)
    expect(is(Data.struct({ a: "ok", b: 0 }))).toEqual(true)
    expect(is({ a: "ok", b: 0 })).toEqual(false)
    expect(is(Data.struct({ a: "ok", b: "no" }))).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
    const pretty = Pretty.to(schema)
    expect(pretty(Data.struct({ a: "ok", b: 0 }))).toEqual("Data({ \"a\": \"ok\", \"b\": 0 })")
  })
})
