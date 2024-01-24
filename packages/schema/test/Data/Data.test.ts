import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Data from "effect/Data"
import { describe, it } from "vitest"

describe("Data > data", () => {
  it("property tests", () => {
    Util.roundtrip(S.data(S.struct({ a: S.string, b: S.number })))
    Util.roundtrip(S.data(S.array(S.number)))
  })

  it("decoding", async () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    await Util.expectDecodeUnknownSuccess(
      schema,
      { a: "ok", b: 0 },
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "ok", b: "0" },
      `({ a: string; b: number } <-> Data<{ a: string; b: number }>)
└─ From side transformation failure
   └─ { a: string; b: number }
      └─ ["b"]
         └─ Expected a number, actual "0"`
    )
  })

  it("encoding", async () => {
    const schema = S.data(S.struct({ a: S.string, b: S.number }))
    await Util.expectEncodeSuccess(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
