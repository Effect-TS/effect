import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("lessThanOrEqualToBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.lessThanOrEqualToBigInt(0n))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `a non-positive bigint
└─ Predicate refinement failure
   └─ Expected a non-positive bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
