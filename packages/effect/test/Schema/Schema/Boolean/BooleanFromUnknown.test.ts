import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BooleanFromUnknown", () => {
  const schema = S.BooleanFromUnknown
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, true, true)
    await Util.expectDecodeUnknownSuccess(schema, 1, true)
    await Util.expectDecodeUnknownSuccess(schema, 1n, true)
    await Util.expectDecodeUnknownSuccess(schema, "a", true)

    await Util.expectDecodeUnknownSuccess(schema, false, false)
    await Util.expectDecodeUnknownSuccess(schema, 0, false)
    await Util.expectDecodeUnknownSuccess(schema, 0n, false)
    await Util.expectDecodeUnknownSuccess(schema, null, false)
    await Util.expectDecodeUnknownSuccess(schema, "", false)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, true)
    await Util.expectEncodeSuccess(schema, false, false)
  })
})
