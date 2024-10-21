import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Not", () => {
  const schema = S.Not
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, true, false)
    await Util.expectDecodeUnknownSuccess(schema, false, true)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, false)
    await Util.expectEncodeSuccess(schema, false, true)
  })
})
