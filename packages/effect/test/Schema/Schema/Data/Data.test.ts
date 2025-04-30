import { describe, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Data", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Data(S.Struct({ a: S.String, b: S.Number })))
    Util.assertions.testRoundtripConsistency(S.Data(S.Array(S.Number)))
  })

  it("decoding", async () => {
    const schema = S.Data(S.Struct({ a: S.String, b: S.Number }))
    await Util.assertions.decoding.succeed(
      schema,
      { a: "ok", b: 0 },
      Data.struct({ a: "ok", b: 0 })
    )
    await Util.assertions.decoding.fail(
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
    await Util.assertions.encoding.succeed(schema, Data.struct({ a: "ok", b: 0 }), { a: "ok", b: 0 })
  })
})
