import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("Uint8Array > Uint8ArrayFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Uint8ArrayFromSelf)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(S.Uint8ArrayFromSelf, new Uint8Array(), new Uint8Array())
    await Util.assertions.decoding.fail(
      S.Uint8ArrayFromSelf,
      null,
      `Expected Uint8ArrayFromSelf, actual null`
    )
  })

  it("encoding", async () => {
    const u8arr = Uint8Array.from([0, 1, 2, 3])
    await Util.assertions.encoding.succeed(S.Uint8ArrayFromSelf, u8arr, u8arr)
  })

  it("pretty", () => {
    const schema = S.Uint8ArrayFromSelf
    Util.assertions.pretty(schema, Uint8Array.from([0, 1, 2, 3]), "new Uint8Array([0,1,2,3])")
  })
})
