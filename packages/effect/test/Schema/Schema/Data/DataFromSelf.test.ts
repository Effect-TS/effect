import * as Data from "effect/Data"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DataFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.DataFromSelf(S.Struct({ a: S.String, b: S.Number })))
    Util.assertions.testRoundtripConsistency(S.DataFromSelf(S.Array(S.Number)))
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
      `Expected Data<{ readonly a: string; readonly b: number }>, actual {"a":"ok","b":0}`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Data.struct({ a: "ok", b: "0" }),
      `Data<{ readonly a: string; readonly b: number }>
└─ { readonly a: string; readonly b: number }
   └─ ["b"]
      └─ Expected number, actual "0"`
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
