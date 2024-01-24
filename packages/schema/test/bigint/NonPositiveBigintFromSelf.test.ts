import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > NonPositiveBigintFromSelf", () => {
  const schema = S.NonPositiveBigintFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `NonPositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected NonPositiveBigintFromSelf (a non-positive bigint), actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
