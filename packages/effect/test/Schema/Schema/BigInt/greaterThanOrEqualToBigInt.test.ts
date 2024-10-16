import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("greaterThanOrEqualToBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.greaterThanOrEqualToBigInt(0n))
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -1n,
      `a non-negative bigint
└─ Predicate refinement failure
   └─ Expected a non-negative bigint, actual -1n`
    )
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
