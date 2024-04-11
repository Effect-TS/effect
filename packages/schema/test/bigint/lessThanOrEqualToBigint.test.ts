import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > lessThanOrEqualToBigInt", () => {
  const schema = S.bigintFromSelf.pipe(S.lessThanOrEqualToBigInt(0n))

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
