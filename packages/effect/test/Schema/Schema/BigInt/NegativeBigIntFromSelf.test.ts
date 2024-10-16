import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NegativeBigIntFromSelf", () => {
  const schema = S.NegativeBigIntFromSelf

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      0n,
      `NegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigintFromSelf, actual 0n`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1n,
      `NegativeBigintFromSelf
└─ Predicate refinement failure
   └─ Expected NegativeBigintFromSelf, actual 1n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1n, -1n)
  })
})
