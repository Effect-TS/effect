import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Data from "effect/Data"
import { describe, expect, it } from "vitest"

describe("Data > dataFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.dataFromSelf(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.dataFromSelf(S.array(S.number)))
  })

  it("decoding", async () => {
    const schema = S.dataFromSelf(S.struct({ a: S.string, b: S.number }))
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
    const pretty = Pretty.make(schema)
    expect(pretty(Data.struct({ a: "ok", b: 0 }))).toEqual(`Data({ "a": "ok", "b": 0 })`)
  })
})
