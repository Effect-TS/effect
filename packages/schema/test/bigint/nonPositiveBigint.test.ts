import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint/nonPositiveBigint", () => {
  const schema = S.bigintFromSelf.pipe(S.nonPositiveBigint())

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 0n, 0n)
    await Util.expectParseFailure(schema, 1n, "Expected a non-positive bigint, actual 1n")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
