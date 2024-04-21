import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Number", () => {
  const schema = S.Number
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 1, 1)
    await Util.expectDecodeUnknownSuccess(schema, NaN, NaN)
    await Util.expectDecodeUnknownSuccess(schema, Infinity, Infinity)
    await Util.expectDecodeUnknownSuccess(schema, -Infinity, -Infinity)
    await Util.expectDecodeUnknownFailure(schema, "a", `Expected a number, actual "a"`)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
