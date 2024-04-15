import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Data from "effect/Data"
import { describe, expect, it } from "vitest"

describe("Data > dataFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.DataFromSelf(S.Struct({ a: S.String, b: S.Number })))
    Util.roundtrip(S.DataFromSelf(S.Array(S.Number)))
  })

  it("decoding", async () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    await Util.expectDecodeUnknownSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "ok", b: 0 },
      `Expected Data<{ a: string; b: number }>, actual {"a":"ok","b":0}`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Data.struct({ a: "ok", b: "0" }),
      `Data<{ a: string; b: number }>
└─ { a: string; b: number }
   └─ ["b"]
      └─ Expected a number, actual "0"`
    )
  })

  it("encoding", async () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    await Util.expectEncodeSuccess(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
  })

  it("is", () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    const is = P.is(schema)
    expect(is(Data.struct({ a: "ok", b: 0 }))).toEqual(true)
    expect(is({ a: "ok", b: 0 })).toEqual(false)
    expect(is(Data.struct({ a: "ok", b: "no" }))).toEqual(false)
  })

  it("pretty", () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    const pretty = Pretty.make(schema)
    expect(pretty(Data.struct({ a: "ok", b: 0 }))).toEqual(`Data({ "a": "ok", "b": 0 })`)
  })
})
