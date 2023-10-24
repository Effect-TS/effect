import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Uint8Array/Uint8Array", () => {
  const schema = S.Uint8Array

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("isSchema", () => {
    expect(S.isSchema(schema)).toEqual(true)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, [0, 1, 2, 3], Uint8Array.from([0, 1, 2, 3]))
    await Util.expectParseFailure(
      schema,
      [12354],
      "/0 Expected 8-bit unsigned integer, actual 12354"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Uint8Array.from([0, 1, 2, 3]), [0, 1, 2, 3])
  })
})
