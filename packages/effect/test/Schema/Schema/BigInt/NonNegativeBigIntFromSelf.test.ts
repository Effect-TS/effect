import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonNegativeBigIntFromSelf", () => {
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
   └─ Expected NonNegativeBigintFromSelf, actual -1n`
    )
  })
})
