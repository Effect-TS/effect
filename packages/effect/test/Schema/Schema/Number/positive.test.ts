import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Positive", () => {
  const schema = S.Positive
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `Positive
└─ Predicate refinement failure
   └─ Expected Positive, actual -1`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `Positive
└─ Predicate refinement failure
   └─ Expected Positive, actual 0`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
