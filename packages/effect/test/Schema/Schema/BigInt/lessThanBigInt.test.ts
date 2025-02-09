import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("lessThanBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.lessThanBigInt(0n))

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `lessThanBigInt(0)
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 0n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `lessThanBigInt(0)
└─ Predicate refinement failure
   └─ Expected a negative bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
