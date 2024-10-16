import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Boolean", () => {
  const schema = S.Boolean
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, true, true)
    await Util.expectDecodeUnknownSuccess(schema, false, false)
    await Util.expectDecodeUnknownFailure(schema, 1, `Expected boolean, actual 1`)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, true)
    await Util.expectEncodeSuccess(schema, false, false)
  })
})
