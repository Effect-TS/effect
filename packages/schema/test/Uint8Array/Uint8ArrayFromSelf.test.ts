import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Uint8Array/Uint8ArrayFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.Uint8ArrayFromSelf)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(S.Uint8ArrayFromSelf, new Uint8Array(), new Uint8Array())
    await Util.expectParseFailure(S.Uint8ArrayFromSelf, null, `Expected Uint8Array, actual null`)
  })

  it("encoding", async () => {
    const u8arr = Uint8Array.from([0, 1, 2, 3])
    await Util.expectEncodeSuccess(S.Uint8ArrayFromSelf, u8arr, u8arr)
  })

  it("pretty", () => {
    const pretty = Pretty.to(S.Uint8ArrayFromSelf)
    expect(pretty(Uint8Array.from([0, 1, 2, 3]))).toEqual("new Uint8Array([0,1,2,3])")
  })
})
