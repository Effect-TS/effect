import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint/greaterThanOrEqualToBigint", () => {
  const schema = S.bigintFromSelf.pipe(S.greaterThanOrEqualToBigint(0n))
  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      -1n,
      "Expected a non-negative bigint, actual -1n"
    )
    await Util.expectParseSuccess(schema, 0n, 0n)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
