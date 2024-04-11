import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > NegativeBigIntFromSelf", () => {
  const schema = S.NegativeBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `NegativeBigIntFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigIntFromSelf (a negative bigint), actual 0n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `NegativeBigIntFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigIntFromSelf (a negative bigint), actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
