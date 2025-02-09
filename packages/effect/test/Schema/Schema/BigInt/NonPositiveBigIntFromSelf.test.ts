import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonPositiveBigIntFromSelf", () => {
  const schema = S.NonPositiveBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `NonPositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected a non-positive bigint, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
