import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("NonPositive", () => {
  const schema = S.NonPositive
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0, 0)
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `NonPositive
└─ Predicate refinement failure
   └─ Expected NonPositive, actual 1`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
