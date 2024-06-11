import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as Data from "effect/Data"
import { describe, it } from "vitest"

describe("Data", () => {
  it("property tests", () => {
    Util.roundtrip(S.Data(S.Struct({ a: S.String, b: S.Number })))
    Util.roundtrip(S.Data(S.Array(S.Number)))
  })

  it("decoding", async () => {
    const schema = S.Data(S.Struct({ a: S.String, b: S.Number }))
    await Util.expectDecodeUnknownSuccess(
      schema,
      { a: "ok", b: 0 },
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "ok", b: "0" },
      `({ readonly a: string; readonly b: number } <-> Data<{ readonly a: string; readonly b: number }>)
└─ Encoded side transformation failure
   └─ { readonly a: string; readonly b: number }
      └─ ["b"]
         └─ Expected number, actual "0"`
    )
  })

  it("encoding", async () => {
    const schema = S.Data(S.Struct({ a: S.String, b: S.Number }))
    await Util.expectEncodeSuccess(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
