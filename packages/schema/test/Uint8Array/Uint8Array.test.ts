import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Uint8Array > Uint8Array", () => {
  const schema = S.Uint8Array

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("isSchema", () => {
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, [0, 1, 2, 3], Uint8Array.from([0, 1, 2, 3]))
    await Util.expectDecodeUnknownFailure(
      schema,
      [12354],
      `Uint8Array
└─ From side transformation failure
   └─ an array of 8-bit unsigned integers
      └─ [0]
         └─ 8-bit unsigned integer
            └─ Predicate refinement failure
               └─ Expected a 8-bit unsigned integer, actual 12354`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Uint8Array.from([0, 1, 2, 3]), [0, 1, 2, 3])
  })
})
