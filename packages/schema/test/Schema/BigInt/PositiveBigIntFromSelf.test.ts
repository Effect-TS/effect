import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("PositiveBigIntFromSelf", () => {
  const schema = S.PositiveBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -1n,
      `PositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected PositiveBigintFromSelf (a positive bigint), actual -1n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `PositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected PositiveBigintFromSelf (a positive bigint), actual 0n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
