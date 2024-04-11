import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > NonPositiveBigIntFromSelf", () => {
  const schema = S.NonPositiveBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n)
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `NonPositiveBigIntFromSelf
└─ Predicate refinement failure
   └─ Expected NonPositiveBigIntFromSelf (a non-positive bigint), actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
