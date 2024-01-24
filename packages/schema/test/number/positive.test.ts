import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > Positive", () => {
  const schema = S.Positive
  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `Positive
└─ Predicate refinement failure
   └─ Expected Positive (a positive number), actual -1`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `Positive
└─ Predicate refinement failure
   └─ Expected Positive (a positive number), actual 0`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
