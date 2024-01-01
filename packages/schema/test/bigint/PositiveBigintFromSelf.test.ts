import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > PositiveBigintFromSelf", () => {
  const schema = S.PositiveBigintFromSelf

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      -1n,
      `PositiveBigintFromSelf
└─ Predicate refinement failure
   └─ Expected PositiveBigintFromSelf (a positive bigint), actual -1n`
    )
    await Util.expectParseFailure(
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
