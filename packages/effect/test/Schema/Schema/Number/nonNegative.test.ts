import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonNegative", () => {
  const schema = S.NonNegative
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0, 0)
    await Util.expectDecodeUnknownSuccess(schema, 1, 1)
  })

  it("encoding", async () => {
    await Util.expectEncodeFailure(
      schema,
      -1,
      `NonNegative
└─ Predicate refinement failure
   └─ Expected a non-negative number, actual -1`
    )
  })
})
