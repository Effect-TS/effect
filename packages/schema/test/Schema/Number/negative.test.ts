import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Negative", () => {
  const schema = S.Negative
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `Negative
└─ Predicate refinement failure
   └─ Expected Negative (a negative number), actual 0`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `Negative
└─ Predicate refinement failure
   └─ Expected Negative (a negative number), actual 1`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
