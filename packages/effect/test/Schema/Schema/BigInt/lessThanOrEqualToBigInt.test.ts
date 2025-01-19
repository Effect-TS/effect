import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("lessThanOrEqualToBigInt", () => {
  const schema = S.BigIntFromSelf.pipe(S.lessThanOrEqualToBigInt(0n))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `lessThanOrEqualToBigInt(0)
└─ Predicate refinement failure
   └─ Expected a non-positive bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
