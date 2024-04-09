import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > NonNegativeBigintFromSelf", () => {
  const schema = S.NonNegativeBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n)
    await Util.expectDecodeUnknownSuccess(schema, 1n)
  })

  it("encoding", async () => {
    await Util.expectEncodeFailure(
      schema,
      -1n,
      `NonNegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected NonNegativeBigintFromSelf (a non-negative bigint), actual -1n`
    )
  })
})
