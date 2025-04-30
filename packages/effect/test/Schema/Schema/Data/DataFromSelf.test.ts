import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as Data from "effect/Data"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DataFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.DataFromSelf(S.Struct({ a: S.String, b: S.Number })))
    Util.assertions.testRoundtripConsistency(S.DataFromSelf(S.Array(S.Number)))
  })

  it("decoding", async () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    await Util.assertions.decoding.succeed(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.assertions.decoding.fail(
      schema,
      { a: "ok", b: 0 },
      `Expected Data<{ readonly a: string; readonly b: number }>, actual {"a":"ok","b":0}`
    )
    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(
      schema,
      Data.struct({ a: "ok", b: 0 }),
      Data.struct({ a: "ok", b: 0 })
    )
  })

  it("is", () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    const is = P.is(schema)
    assertTrue(is(Data.struct({ a: "ok", b: 0 })))
    assertFalse(is({ a: "ok", b: 0 }))
    assertFalse(is(Data.struct({ a: "ok", b: "no" })))
  })

  it("pretty", () => {
    const schema = S.DataFromSelf(S.Struct({ a: S.String, b: S.Number }))
    Util.assertions.pretty(schema, Data.struct({ a: "ok", b: 0 }), `Data({ "a": "ok", "b": 0 })`)
  })
})
