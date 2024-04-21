import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("String", () => {
  const schema = S.String
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownFailure(schema, 1, "Expected a string, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
  })
})
